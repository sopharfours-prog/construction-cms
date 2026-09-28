import { Fragment, type ReactNode } from "react";

import {
  isSafeHref,
  type RichTextDoc,
  type RichTextMark,
  type RichTextNode,
} from "@/lib/content/rich-text";
import { cn } from "@/lib/utils";

/**
 * Renders stored rich text (already allow-listed on save) as React elements.
 * No HTML strings are injected, and links are checked again here.
 */
function withMarks(text: ReactNode, marks: RichTextMark[] | undefined, key: string): ReactNode {
  return (marks ?? []).reduce<ReactNode>((child, mark, i) => {
    const k = `${key}-${i}`;
    switch (mark.type) {
      case "bold":
        return <strong key={k}>{child}</strong>;
      case "italic":
        return <em key={k}>{child}</em>;
      case "underline":
        return <u key={k}>{child}</u>;
      case "strike":
        return <s key={k}>{child}</s>;
      case "code":
        return <code key={k}>{child}</code>;
      case "link": {
        const href = mark.attrs?.href;
        if (!isSafeHref(href)) return child;
        const external = !href.startsWith("/");
        return (
          <a
            key={k}
            href={href}
            {...(external ? { target: "_blank", rel: "noopener noreferrer nofollow" } : {})}
          >
            {child}
          </a>
        );
      }
      default:
        return child;
    }
  }, text);
}

function renderNodes(nodes: RichTextNode[] | undefined, path: string): ReactNode {
  return nodes?.map((node, i) => renderNode(node, `${path}.${i}`));
}

function renderNode(node: RichTextNode, key: string): ReactNode {
  const children = renderNodes(node.content, key);
  switch (node.type) {
    case "text":
      return <Fragment key={key}>{withMarks(node.text, node.marks, key)}</Fragment>;
    case "paragraph":
      return <p key={key}>{children}</p>;
    case "heading":
      return node.attrs?.level === 3 || node.attrs?.level === 4 ? (
        <h3 key={key}>{children}</h3>
      ) : (
        <h2 key={key}>{children}</h2>
      );
    case "bulletList":
      return <ul key={key}>{children}</ul>;
    case "orderedList":
      return (
        <ol key={key} start={typeof node.attrs?.start === "number" ? node.attrs.start : undefined}>
          {children}
        </ol>
      );
    case "listItem":
      return <li key={key}>{children}</li>;
    case "blockquote":
      return <blockquote key={key}>{children}</blockquote>;
    case "horizontalRule":
      return <hr key={key} />;
    case "hardBreak":
      return <br key={key} />;
    default:
      return null;
  }
}

export function RichText({
  doc,
  className,
}: {
  doc: RichTextDoc | null | undefined;
  className?: string;
}) {
  if (!doc?.content?.length) return null;
  return <div className={cn("prose-site", className)}>{renderNodes(doc.content, "n")}</div>;
}
