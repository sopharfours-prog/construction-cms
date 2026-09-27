import type { Prisma } from "../../src/generated/prisma/client";

/**
 * Rich text is stored as ProseMirror/Tiptap JSON (the CMS editor format from
 * Phase 5) and rendered server-side through an allow-list of node types, so
 * stored content can never carry raw HTML or scripts.
 */
export function doc(...paragraphs: string[]): Prisma.InputJsonValue {
  return {
    type: "doc",
    content: paragraphs.map((text) => ({
      type: "paragraph",
      content: [{ type: "text", text }],
    })),
  };
}
