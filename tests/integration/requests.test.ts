import { mkdtemp, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import type { CurrentUser } from "@/lib/auth/session";
import { allPermissions } from "@/lib/permissions/registry";

const localDir = await mkdtemp(path.join(tmpdir(), "cms-requests-"));
process.env.STORAGE_DRIVER = "local";
process.env.LOCAL_STORAGE_DIR = localDir;

const { db } = await import("@/lib/db/client");
const { createFormToken } = await import("@/lib/security/form-token");
const { getServerEnv } = await import("@/lib/env/server");
const { submitInquiry, submitQuote } = await import("@/server/services/requests/submit");
const common = await import("@/server/services/requests/common");

const request = { ipAddress: `203.0.113.${Math.floor(Math.random() * 200)}`, userAgent: "vitest" };
const pdf = () => ({ name: "C:\\docs\\ແຜນ.pdf", buffer: Buffer.from("%PDF-1.4\n%test\n") });
const created: { inquiries: string[]; quotes: string[] } = { inquiries: [], quotes: [] };
let ctx: { user: CurrentUser; request: typeof request };
const files = async () =>
  (await readdir(localDir, { recursive: true, withFileTypes: true })).filter((d) => d.isFile())
    .length;

beforeAll(async () => {
  await db.rateLimit.deleteMany({});
  const admin = await db.user.findFirstOrThrow({ where: { email: "admin@example.com" } });
  ctx = {
    user: {
      id: admin.id,
      name: "IT",
      email: admin.email,
      avatarUrl: null,
      preferredLocale: null,
      role: { key: "T", name: "T" },
      permissions: new Set(allPermissions.map((p) => p.key)),
    },
    request,
  };
});
afterAll(async () => {
  await db.inquiry.deleteMany({ where: { id: { in: created.inquiries } } });
  await db.quoteRequest.deleteMany({ where: { id: { in: created.quotes } } });
  await rm(localDir, { recursive: true, force: true });
  await db.$disconnect();
});

const token = () => createFormToken(getServerEnv().AUTH_SECRET, Date.now() - 10_000);
const inquiryInput = (email: string) => ({
  name: "Test",
  email,
  phone: undefined,
  company: null,
  subject: "Hello",
  message: "A message long enough.",
  formToken: token(),
});

describe("public submissions", () => {
  it("stores an inquiry with private attachments", async () => {
    const result = await submitInquiry(inquiryInput("int-a@example.com"), [pdf()], request, "en");
    created.inquiries.push(result.id);
    const row = await db.inquiry.findUniqueOrThrow({
      where: { id: result.id },
      include: { attachments: true },
    });
    expect(row.locale).toBe("en");
    expect(row.attachments[0]).toMatchObject({
      originalName: "ແຜນ.pdf",
      mimeType: "application/pdf",
    });
    expect(row.attachments[0]!.storageKey).toMatch(/^private\/inquiries\//);
    expect(await files()).toBe(1);
  });

  it("drops honeypot submissions without storing anything", async () => {
    const before = await db.inquiry.count();
    const result = await submitInquiry(
      { ...inquiryInput("int-b@example.com"), website: "http://spam.example" },
      [pdf()],
      request,
    );
    expect(result.spam).toBe(true);
    expect(await db.inquiry.count()).toBe(before);
    expect(await files()).toBe(1);
  });

  it("removes stored files when saving the request fails", async () => {
    // A real database failure after the files were written: name exceeds VARCHAR(120).
    await expect(
      submitInquiry(
        { ...inquiryInput("int-c@example.com"), name: "x".repeat(300) },
        [pdf(), pdf()],
        request,
      ),
    ).rejects.toThrow();
    expect(await files()).toBe(1);
  });

  it("gives quotes unique sequential references", async () => {
    const base = {
      customerName: "Q",
      company: null,
      phone: "021 123456",
      serviceId: null,
      projectType: "Office",
      location: "Pakse",
      estimatedBudget: null,
      currency: "LAK" as const,
      expectedStartDate: null,
      description: "Office building, three floors.",
    };
    const results = await Promise.all(
      [1, 2, 3].map((i) =>
        submitQuote({ ...base, email: `int-q${i}@example.com`, formToken: token() }, [], {
          ...request,
          ipAddress: `203.0.113.2${i}`,
        }),
      ),
    );
    created.quotes.push(...results.map((r) => r.id));
    const refs = results.map((r) => r.reference!);
    expect(new Set(refs).size).toBe(3);
    const numbers = refs.map((r) => Number(r.split("-")[2])).sort((a, b) => a - b);
    expect(numbers[2]! - numbers[0]!).toBe(2);
  });
});

describe("staff workflow", () => {
  it("assigns only staff who can see the request", async () => {
    const id = created.inquiries[0]!;
    const staff = await common.listAssignableStaff("inquiry");
    const viewer = await db.user.findFirstOrThrow({ where: { email: "projects@example.com" } }); // project editor: no inquiries.view
    expect(staff.some((s) => s.id === viewer.id)).toBe(false);
    await expect(common.assignRequest("inquiry", id, viewer.id, ctx)).rejects.toMatchObject({
      messageKey: "assigneeInvalid",
    });
    await common.assignRequest("inquiry", id, ctx.user.id, ctx);
    expect((await db.inquiry.findUniqueOrThrow({ where: { id } })).assignedToId).toBe(ctx.user.id);
  });

  it("changes status, rejects unknown statuses, archives and notes", async () => {
    const id = created.inquiries[0]!;
    await expect(common.setRequestStatus("inquiry", id, "QUOTED", ctx)).rejects.toMatchObject({
      field: "status",
    });
    await common.setRequestStatus("inquiry", id, "IN_PROGRESS", ctx);
    await common.addRequestNote("inquiry", id, "Called the customer.", ctx);
    await common.setRequestArchived("inquiry", id, true, ctx);
    const row = await db.inquiry.findUniqueOrThrow({ where: { id }, include: { notes: true } });
    expect(row).toMatchObject({ status: "IN_PROGRESS" });
    expect(row.archivedAt).not.toBeNull();
    expect(row.notes.map((n) => n.body)).toEqual(["Called the customer."]);
  });

  it("replies by email, keeps a copy and moves the request forward", async () => {
    const id = created.quotes[0]!;
    const log = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    await common.replyToRequest(
      "quote",
      id,
      { subject: "Your quote\r\nBcc: attacker@example.com", body: "We will visit on Monday." },
      ctx,
    );
    const printed = log.mock.calls.flat().join("\n");
    log.mockRestore();
    expect(printed).toContain("To: int-q");
    expect(printed).toMatch(/Subject: Your quote Bcc: attacker@example.com\n/); // header injection flattened to one line
    const row = await db.quoteRequest.findUniqueOrThrow({
      where: { id },
      include: { notes: true },
    });
    expect(row.status).toBe("CONTACTED");
    expect(row.notes[0]!.body).toContain("We will visit on Monday.");
  });

  it("deletes a request together with its files and records it", async () => {
    const id = created.inquiries[0]!;
    await common.deleteRequest("inquiry", id, ctx);
    expect(await db.inquiry.findUnique({ where: { id } })).toBeNull();
    expect(await files()).toBe(0);
    const audit = await db.auditLog.findFirstOrThrow({ where: { entityId: id, action: "DELETE" } });
    expect(audit.oldValue).toMatchObject({ attachments: 1 });
  });
});
