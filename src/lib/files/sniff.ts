/**
 * File type detection from content (magic bytes). The browser's MIME type and
 * the file name are never trusted: an .exe renamed to .jpg is rejected here.
 */
export type FileKind = "IMAGE" | "VIDEO" | "DOCUMENT";
export type DetectedType = { mime: string; ext: string; kind: FileKind };

const ascii = (buf: Uint8Array, start: number, end: number) =>
  String.fromCharCode(...buf.subarray(start, end));
const startsWith = (buf: Uint8Array, bytes: number[], offset = 0) =>
  bytes.every((b, i) => buf[offset + i] === b);

function isoBrands(buf: Uint8Array): string[] {
  if (buf.length < 16 || ascii(buf, 4, 8) !== "ftyp") return [];
  const size = Math.min(
    ((buf[0]! << 24) | (buf[1]! << 16) | (buf[2]! << 8) | buf[3]!) >>> 0,
    buf.length,
    256,
  );
  const brands = [ascii(buf, 8, 12)];
  for (let i = 16; i + 4 <= size; i += 4) brands.push(ascii(buf, i, i + 4));
  return brands;
}

export function detectFileType(buf: Uint8Array): DetectedType | null {
  if (buf.length < 12) return null;

  if (startsWith(buf, [0xff, 0xd8, 0xff])) return { mime: "image/jpeg", ext: "jpg", kind: "IMAGE" };
  if (startsWith(buf, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
    return { mime: "image/png", ext: "png", kind: "IMAGE" };
  if (ascii(buf, 0, 4) === "RIFF" && ascii(buf, 8, 12) === "WEBP")
    return { mime: "image/webp", ext: "webp", kind: "IMAGE" };

  const brands = isoBrands(buf);
  if (brands.some((b) => b === "avif" || b === "avis"))
    return { mime: "image/avif", ext: "avif", kind: "IMAGE" };
  if (
    brands.some((b) => ["isom", "iso2", "mp41", "mp42", "avc1", "M4V ", "dash"].includes(b)) &&
    !brands.some((b) => b.startsWith("hei") || b === "mif1")
  ) {
    return { mime: "video/mp4", ext: "mp4", kind: "VIDEO" };
  }
  if (
    startsWith(buf, [0x1a, 0x45, 0xdf, 0xa3]) &&
    ascii(buf, 0, Math.min(buf.length, 64)).includes("webm")
  ) {
    return { mime: "video/webm", ext: "webm", kind: "VIDEO" };
  }

  if (ascii(buf, 0, 5) === "%PDF-")
    return { mime: "application/pdf", ext: "pdf", kind: "DOCUMENT" };

  // Office Open XML is a ZIP whose entry names are stored uncompressed in the headers.
  if (startsWith(buf, [0x50, 0x4b, 0x03, 0x04])) {
    const text = new TextDecoder("latin1").decode(buf);
    if (text.includes("[Content_Types].xml") || text.includes("_rels/.rels")) {
      if (text.includes("word/"))
        return {
          mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          ext: "docx",
          kind: "DOCUMENT",
        };
      if (text.includes("xl/"))
        return {
          mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          ext: "xlsx",
          kind: "DOCUMENT",
        };
    }
  }
  return null;
}

/** Upload rules per destination. Sizes in bytes. */
export const uploadPolicies = {
  media: {
    extensions: ["jpg", "png", "webp", "avif", "mp4", "webm", "pdf", "docx", "xlsx"],
    maxBytes: { IMAGE: 20 * 1024 * 1024, VIDEO: 100 * 1024 * 1024, DOCUMENT: 20 * 1024 * 1024 },
  },
  attachment: {
    extensions: ["pdf", "jpg", "png", "docx"],
    maxBytes: { IMAGE: 10 * 1024 * 1024, VIDEO: 0, DOCUMENT: 10 * 1024 * 1024 },
  },
} as const satisfies Record<
  string,
  { extensions: readonly string[]; maxBytes: Record<FileKind, number> }
>;

export type UploadPolicyName = keyof typeof uploadPolicies;

export const maxUploadBytes = (policy: UploadPolicyName) =>
  Math.max(...Object.values(uploadPolicies[policy].maxBytes));

export type FileCheck =
  | { ok: true; type: DetectedType }
  | { ok: false; reason: "fileType" | "fileTooLarge" | "fileEmpty" };

export function checkUpload(buf: Uint8Array, policyName: UploadPolicyName): FileCheck {
  if (buf.length === 0) return { ok: false, reason: "fileEmpty" };
  const policy = uploadPolicies[policyName];
  const type = detectFileType(buf);
  if (!type || !(policy.extensions as readonly string[]).includes(type.ext))
    return { ok: false, reason: "fileType" };
  if (buf.length > policy.maxBytes[type.kind]) return { ok: false, reason: "fileTooLarge" };
  return { ok: true, type };
}

/** Display name from the browser: path parts and control characters removed. */
export function cleanOriginalName(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? "";
  const cleaned = base
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .trim()
    .slice(0, 200);
  return cleaned || "file";
}
