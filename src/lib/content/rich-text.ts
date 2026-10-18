import { z } from "zod";

/**
 * Rich text is stored as ProseMirror/Tiptap JSON and passed through this
 * allow-list on every write. Anything not listed (unknown nodes, marks,
 * attributes, javascript: links, HTML) is dropped, so stored content is safe
 * to render regardless of what a client sent.
 */
export type RichTextMark = { type: string; attrs?: Record<string, unknown> };
export type RichTextNode = {
  type: string;
  text?: string;
  attrs?: Record<string, unknown>;
  marks?: RichTextMark[];
  content?: RichTextNode[];
};
export type RichTextDoc = { type: "doc"; content: RichTextNode[] };

const BLOCK_NODES = new Set([
  "paragraph",
  "heading",
  "bulletList",
  "orderedList",
  "listItem",
  "blockquote",
  "horizontalRule",
  "hardBreak",
  "text",
]);
const MARKS = new Set(["bold", "italic", "underline", "strike", "code", "link"]);
const MAX_DEPTH = 12;
const MAX_TEXT = 50_000;

export function isSafeHref(href: unknown): href is string {
  if (typeof href !== "string" || href.length > 2048) return false;
  if (/[\\\u0000-\u001f]/.test(href)) return false;
  if (href.startsWith("/") && !href.startsWith("//")) return true;
  try {
    return ["http:", "https:", "mailto:", "tel:"].includes(new URL(href).protocol);
  } catch {
    return false;
  }
}

function sanitizeMarks(marks: unknown): RichTextMark[] | undefined {
  if (!Array.isArray(marks)) return undefined;
  const clean: RichTextMark[] = [];
  for (const mark of marks) {
    if (!mark || typeof mark !== "object" || !MARKS.has((mark as RichTextMark).type)) continue;
    const type = (mark as RichTextMark).type;
    if (type === "link") {
      const href = (mark as RichTextMark).attrs?.href;
      if (!isSafeHref(href)) continue;
      const external = !href.startsWith("/");
      clean.push({
        type,
        attrs: {
          href,
          ...(external ? { target: "_blank", rel: "noopener noreferrer nofollow" } : {}),
        },
      });
    } else {
      clean.push({ type });
    }
  }
  return clean.length ? clean : undefined;
}

function sanitizeNode(node: unknown, depth: number): RichTextNode | null {
  if (!node || typeof node !== "object" || depth > MAX_DEPTH) return null;
  const { type, text, attrs, marks, content } = node as RichTextNode;
  if (typeof type !== "string" || !BLOCK_NODES.has(type)) return null;

  if (type === "text") {
    if (typeof text !== "string" || text.length === 0) return null;
    const cleanMarks = sanitizeMarks(marks);
    return { type, text: text.slice(0, MAX_TEXT), ...(cleanMarks ? { marks: cleanMarks } : {}) };
  }

  const result: RichTextNode = { type };
  if (type === "heading") {
    const level = Number(attrs?.level);
    result.attrs = { level: level >= 2 && level <= 4 ? level : 2 };
  }
  if (type === "orderedList") {
    const start = Number(attrs?.start);
    if (Number.isInteger(start) && start > 1 && start < 10_000) result.attrs = { start };
  }
  if (Array.isArray(content)) {
    const children = content
      .map((child) => sanitizeNode(child, depth + 1))
      .filter(Boolean) as RichTextNode[];
    if (children.length) result.content = children;
  }
  return result;
}

export function sanitizeRichText(value: unknown): RichTextDoc {
  const content =
    value &&
    typeof value === "object" &&
    (value as RichTextDoc).type === "doc" &&
    Array.isArray((value as RichTextDoc).content)
      ? (value as RichTextDoc).content
      : [];
  return {
    type: "doc",
    content: content.map((node) => sanitizeNode(node, 1)).filter(Boolean) as RichTextNode[],
  };
}

export function richTextToPlain(doc: RichTextDoc | null | undefined): string {
  const parts: string[] = [];
  const walk = (node: RichTextNode) => {
    if (node.text) parts.push(node.text);
    node.content?.forEach(walk);
    if (node.type !== "text") parts.push(" ");
  };
  doc?.content.forEach(walk);
  return parts.join("").replace(/\s+/g, " ").trim();
}

export function isRichTextEmpty(doc: RichTextDoc | null | undefined): boolean {
  return richTextToPlain(doc).length === 0;
}

/** Form field carrying editor JSON as a string. Always sanitized; empty → null. */
export const richTextField = z
  .string()
  .max(500_000, { error: "tooLong" })
  .optional()
  .transform((raw, ctx): RichTextDoc | null => {
    if (!raw) return null;
    try {
      const doc = sanitizeRichText(JSON.parse(raw));
      return isRichTextEmpty(doc) ? null : doc;
    } catch {
      ctx.addIssue({ code: "custom", message: "invalid" });
      return z.NEVER;
    }
  });
