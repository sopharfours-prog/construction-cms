/** RFC 6266 header with an ASCII fallback and a UTF-8 name (Lao file names). */
export function contentDisposition(name: string | undefined, inline: boolean): string {
  const type = inline ? "inline" : "attachment";
  if (!name) return type;
  const clean = name.replace(/[\r\n"\\/]/g, "_").slice(0, 200);
  const ascii = clean.replace(/[^\x20-\x7e]/g, "_");
  return `${type}; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(clean)}`;
}
