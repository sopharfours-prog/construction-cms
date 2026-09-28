import { mkdtemp, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { CreateBucketCommand, HeadObjectCommand, S3Client } from "@aws-sdk/client-s3";
import sharp from "sharp";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { CurrentUser } from "@/lib/auth/session";
import { allPermissions } from "@/lib/permissions/registry";

const localDir = await mkdtemp(path.join(tmpdir(), "cms-media-"));
process.env.STORAGE_DRIVER = "local";
process.env.LOCAL_STORAGE_DIR = localDir;

const { db } = await import("@/lib/db/client");
const { createLocalAdapter } = await import("@/lib/storage/local");
const { createS3Adapter } = await import("@/lib/storage/s3");
const { createStorageKey } = await import("@/lib/storage/keys");
const media = await import("@/server/services/media/media");

const S3_ENDPOINT = process.env.TEST_S3_ENDPOINT ?? "http://127.0.0.1:9000";
const created: string[] = [];
let ctx: { user: CurrentUser; request: { ipAddress: null; userAgent: string } };

async function streamToBuffer(stream: ReadableStream<Uint8Array>) {
  return Buffer.from(await new Response(stream).arrayBuffer());
}

beforeAll(async () => {
  const actor = await db.user.findFirstOrThrow({ where: { email: "admin@example.com" } });
  ctx = {
    user: {
      id: actor.id,
      name: "IT",
      email: actor.email,
      avatarUrl: null,
      preferredLocale: null,
      role: { key: "T", name: "T" },
      permissions: new Set(allPermissions.map((p) => p.key)),
    },
    request: { ipAddress: null, userAgent: "vitest" },
  };
});
afterAll(async () => {
  await db.project.updateMany({
    where: { coverImageId: { in: created } },
    data: { coverImageId: null },
  });
  await db.auditLog.count(); // audit rows are append-only by design; media rows stay soft-deleted
  await db.media.deleteMany({ where: { id: { in: created } } });
  await rm(localDir, { recursive: true, force: true });
  await db.$disconnect();
});

describe("local storage adapter", () => {
  it("stores, reads and deletes; refuses keys outside the root", async () => {
    const storage = createLocalAdapter(localDir);
    const key = createStorageKey("private/quotes", "pdf");
    await storage.put(key, Buffer.from("%PDF-1.4 test"), { contentType: "application/pdf" });
    const object = await storage.get(key);
    expect(object?.contentType).toBe("application/pdf");
    expect((await streamToBuffer(object!.body)).toString()).toBe("%PDF-1.4 test");
    expect(() => storage.publicUrl(key)).toThrow();
    await storage.delete(key);
    expect(await storage.get(key)).toBeNull();
    await expect(storage.get("public/media/2026/09/../../../../etc/passwd")).rejects.toThrow(
      "Invalid storage key",
    );
  });
});

describe("S3 storage adapter", () => {
  it("round-trips an object through the S3 API", async (test) => {
    const reachable = await fetch(S3_ENDPOINT).then(
      () => true,
      () => false,
    );
    if (!reachable) test.skip();
    const config = {
      STORAGE_DRIVER: "s3" as const,
      S3_ENDPOINT,
      S3_REGION: "us-east-1",
      S3_BUCKET: "cms-test",
      S3_ACCESS_KEY: "test",
      S3_SECRET_KEY: "test",
      S3_PUBLIC_URL: `${S3_ENDPOINT}/cms-test`,
      S3_FORCE_PATH_STYLE: true,
    };
    const client = new S3Client({
      region: "us-east-1",
      endpoint: S3_ENDPOINT,
      forcePathStyle: true,
      credentials: { accessKeyId: "test", secretAccessKey: "test" },
    });
    await client.send(new CreateBucketCommand({ Bucket: "cms-test" })).catch(() => undefined);

    const storage = createS3Adapter(config);
    const key = createStorageKey("public/media", "png");
    const png = await sharp({ create: { width: 4, height: 4, channels: 3, background: "#14325a" } })
      .png()
      .toBuffer();
    await storage.put(key, png, {
      contentType: "image/png",
      downloadName: "ຮູບ.png",
      inline: true,
    });
    expect(storage.publicUrl(key)).toBe(`${S3_ENDPOINT}/cms-test/${key}`);
    const object = await storage.get(key);
    expect(object?.contentType).toBe("image/png");
    expect(await streamToBuffer(object!.body)).toEqual(png);
    // Buckets are private by default; public/ is exposed by bucket policy or CDN (see DEPLOYMENT.md).
    const head = await client.send(new HeadObjectCommand({ Bucket: "cms-test", Key: key }));
    expect(head.CacheControl).toContain("immutable");
    expect(head.ContentDisposition).toContain("filename*=UTF-8''%E0%BA%AE");
    await storage.delete(key);
    expect(await storage.get(key)).toBeNull();
  });
});

describe("media service", () => {
  it("re-encodes images: applies orientation and strips EXIF", async () => {
    // 200x100 image tagged "rotate 90°" with a secret in EXIF.
    const input = await sharp({
      create: { width: 200, height: 100, channels: 3, background: "#c99a2e" },
    })
      .jpeg()
      .withMetadata({ orientation: 6 })
      .withExif({ IFD0: { Copyright: "SECRET-LOCATION-43.1N" } })
      .toBuffer();
    expect(input.includes("SECRET-LOCATION")).toBe(true);

    const item = await media.uploadMedia(
      { name: "C:\\fakepath\\site photo.jpg", buffer: input },
      { altText: "Site" },
      ctx,
    );
    created.push(item.id);
    expect(item).toMatchObject({
      kind: "IMAGE",
      mimeType: "image/jpeg",
      width: 100,
      height: 200,
      originalName: "site photo.jpg",
    });
    expect(item.url).toMatch(/^\/media\/media\/\d{4}\/\d{2}\/[0-9a-f-]{36}\.jpg$/);
    expect(item.blurDataUrl).toMatch(/^data:image\/webp;base64,/);

    const row = await db.media.findUniqueOrThrow({ where: { id: item.id } });
    const stored = await (await import("@/lib/storage")).getStorage().get(row.storageKey);
    const bytes = await streamToBuffer(stored!.body);
    expect(bytes.includes("SECRET-LOCATION")).toBe(false);
    expect((await sharp(bytes).metadata()).orientation ?? 1).toBe(1);

    const audit = await db.auditLog.findFirst({ where: { entityId: item.id, action: "UPLOAD" } });
    expect(audit).not.toBeNull();
  });

  it("rejects disguised and corrupt files without storing anything", async () => {
    const before = (await readdir(localDir, { recursive: true })).length;
    await expect(
      media.uploadMedia(
        { name: "x.jpg", buffer: Buffer.from("MZ this is really an exe file....") },
        {},
        ctx,
      ),
    ).rejects.toMatchObject({ messageKey: "fileType" });
    const truncated = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(64, 7)]);
    await expect(
      media.uploadMedia({ name: "broken.jpg", buffer: truncated }, {}, ctx),
    ).rejects.toMatchObject({ messageKey: "fileCorrupt" });
    expect((await readdir(localDir, { recursive: true })).length).toBe(before);
  });

  it("replaces a file in place and blocks deleting files in use", async () => {
    const id = created[0]!;
    const oldKey = (await db.media.findUniqueOrThrow({ where: { id } })).storageKey;
    const png = await sharp({
      create: { width: 300, height: 120, channels: 4, background: "#ffffff" },
    })
      .png()
      .toBuffer();
    await expect(
      media.replaceMedia(id, { name: "doc.pdf", buffer: Buffer.from("%PDF-1.4 ....") }, ctx),
    ).rejects.toMatchObject({ messageKey: "replaceKind" });
    const replaced = await media.replaceMedia(id, { name: "new.png", buffer: png }, ctx);
    expect(replaced).toMatchObject({ id, mimeType: "image/png", width: 300 });
    const storage = (await import("@/lib/storage")).getStorage();
    expect(await storage.get(oldKey)).toBeNull();

    const project = await db.project.findFirstOrThrow({ where: { deletedAt: null } });
    const previousCover = project.coverImageId;
    await db.project.update({ where: { id: project.id }, data: { coverImageId: id } });
    expect((await media.getMediaUsage(id, "en")).map((u) => u.type)).toEqual(["project"]);
    await expect(media.deleteMedia(id, ctx)).rejects.toMatchObject({
      code: "conflict",
      messageKey: "mediaInUse",
    });
    await db.project.update({ where: { id: project.id }, data: { coverImageId: previousCover } });

    const key = (await db.media.findUniqueOrThrow({ where: { id } })).storageKey;
    await media.deleteMedia(id, ctx);
    expect((await db.media.findUniqueOrThrow({ where: { id } })).deletedAt).not.toBeNull();
    expect(await storage.get(key)).toBeNull();
  });
});
