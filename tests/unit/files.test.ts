import { describe, expect, it } from "vitest";

import { checkUpload, cleanOriginalName, detectFileType } from "@/lib/files/sniff";
import { contentDisposition } from "@/lib/storage/content-disposition";
import { createStorageKey, isValidStorageKey } from "@/lib/storage/keys";
import { isSameOrigin } from "@/lib/security/same-origin";

const bytes = (...parts: (number[] | string)[]) =>
  Uint8Array.from(
    parts
      .flatMap((p) => (typeof p === "string" ? [...p].map((c) => c.charCodeAt(0)) : p))
      .concat(new Array(32).fill(0)),
  );

describe("detectFileType", () => {
  it.each([
    ["jpg", bytes([0xff, 0xd8, 0xff, 0xe0])],
    ["png", bytes([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])],
    ["webp", bytes("RIFF", [0, 0, 0, 0], "WEBPVP8 ")],
    ["avif", bytes([0, 0, 0, 0x1c], "ftypavif", [0, 0, 0, 0], "avifmif1")],
    ["mp4", bytes([0, 0, 0, 0x18], "ftypisom", [0, 0, 2, 0], "isomiso2")],
    ["webm", bytes([0x1a, 0x45, 0xdf, 0xa3, 0x9f, 0x42, 0x86, 0x81, 0x01], "B\x82webm")],
    ["pdf", bytes("%PDF-1.7\n")],
    ["docx", bytes([0x50, 0x4b, 0x03, 0x04], "....[Content_Types].xml....word/document.xml")],
    ["xlsx", bytes([0x50, 0x4b, 0x03, 0x04], "....[Content_Types].xml....xl/workbook.xml")],
  ])("recognises %s by content", (ext, data) => {
    expect(detectFileType(data)?.ext).toBe(ext);
  });

  it("rejects disguised and unsupported files", () => {
    expect(detectFileType(bytes("MZ\x90\x00 this is an exe"))).toBeNull();
    expect(detectFileType(bytes('<svg xmlns="http://www.w3.org/2000/svg"><script>'))).toBeNull();
    expect(detectFileType(bytes("<html><script>alert(1)</script>"))).toBeNull();
    expect(detectFileType(bytes([0x50, 0x4b, 0x03, 0x04], "evil.js payload"))).toBeNull(); // plain zip
    expect(detectFileType(bytes([0, 0, 0, 0x18], "ftypheic", [0, 0, 0, 0], "mif1heic"))).toBeNull(); // HEIC isn't mp4
  });
});

describe("checkUpload", () => {
  it("applies per-destination types and sizes", () => {
    expect(checkUpload(new Uint8Array(), "media")).toEqual({ ok: false, reason: "fileEmpty" });
    expect(
      checkUpload(bytes([0, 0, 0, 0x18], "ftypisom", [0, 0, 2, 0], "isomiso2"), "attachment"),
    ).toEqual({ ok: false, reason: "fileType" });
    const big = new Uint8Array(11 * 1024 * 1024);
    big.set([0x25, 0x50, 0x44, 0x46, 0x2d]);
    expect(checkUpload(big, "attachment")).toEqual({ ok: false, reason: "fileTooLarge" });
    expect(checkUpload(big, "media")).toMatchObject({ ok: true, type: { ext: "pdf" } });
  });
});

describe("storage keys", () => {
  it("are generated, never derived from user input", () => {
    const key = createStorageKey("public/media", "jpg", new Date("2026-09-28T00:00:00Z"));
    expect(key).toMatch(/^public\/media\/2026\/09\/[0-9a-f-]{36}\.jpg$/);
    expect(isValidStorageKey(key)).toBe(true);
    expect(() => createStorageKey("public/media", "../x")).toThrow();
  });

  it.each([
    "public/media/2026/09/../../../etc/passwd",
    "public/media/2026/09/a.jpg",
    "/etc/passwd",
    "private/quotes/2026/09/x/../y.pdf",
    "",
  ])("rejects %j", (key) => expect(isValidStorageKey(key)).toBe(false));
});

describe("helpers", () => {
  it("builds safe Content-Disposition headers for Lao names", () => {
    const header = contentDisposition('ແຜນ "ໂຄງການ"\r\n.pdf', false);
    expect(header).not.toMatch(/[\r\n]/);
    expect(header).toContain("filename*=UTF-8''");
    expect(header.startsWith("attachment;")).toBe(true);
  });

  it("strips paths and control characters from original names", () => {
    expect(cleanOriginalName("C:\\Users\\me\\ຮູບ\u0000.jpg")).toBe("ຮູບ.jpg");
    expect(cleanOriginalName("../../")).toBe("file");
  });

  it("accepts only same-origin writes", () => {
    const h = (o: Record<string, string>) => new Headers(o);
    expect(isSameOrigin(h({ origin: "https://cms.example.com", host: "cms.example.com" }))).toBe(
      true,
    );
    expect(
      isSameOrigin(
        h({
          origin: "https://cms.example.com",
          host: "internal:3000",
          "x-forwarded-host": "cms.example.com",
        }),
      ),
    ).toBe(true);
    expect(isSameOrigin(h({ origin: "https://evil.example", host: "cms.example.com" }))).toBe(
      false,
    );
    expect(isSameOrigin(h({ host: "cms.example.com" }))).toBe(false);
    expect(isSameOrigin(h({ origin: "null", host: "cms.example.com" }))).toBe(false);
  });
});
