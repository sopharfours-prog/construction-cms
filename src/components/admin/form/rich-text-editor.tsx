"use client";

import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
  BoldIcon,
  Heading2Icon,
  Heading3Icon,
  ItalicIcon,
  LinkIcon,
  ListIcon,
  ListOrderedIcon,
  QuoteIcon,
  Redo2Icon,
  StrikethroughIcon,
  UnderlineIcon,
  Undo2Icon,
  type LucideIcon,
} from "lucide-react";
import { useState } from "react";

import type { AdminMessages } from "@/i18n/admin";
import { cn } from "@/lib/utils";

type Labels = AdminMessages["common"]["richText"];

type RichTextEditorProps = {
  id: string;
  name: string;
  defaultValue: unknown;
  labels: Labels;
  invalid?: boolean;
  describedBy?: string;
};

/**
 * Tiptap editor. The document is submitted as JSON in a hidden input and is
 * sanitized again on the server (lib/content/rich-text) before saving.
 */
export function RichTextEditor({
  id,
  name,
  defaultValue,
  labels,
  invalid,
  describedBy,
}: RichTextEditorProps) {
  const [json, setJson] = useState(() => (defaultValue ? JSON.stringify(defaultValue) : ""));
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        codeBlock: false,
        code: false,
        link: { openOnClick: false, autolink: true, protocols: ["http", "https", "mailto", "tel"] },
      }),
    ],
    content: (defaultValue as object | null) ?? "",
    editorProps: {
      attributes: {
        id,
        role: "textbox",
        "aria-multiline": "true",
        ...(invalid ? { "aria-invalid": "true" } : {}),
        ...(describedBy ? { "aria-describedby": describedBy } : {}),
        class: "prose-editor min-h-48 px-3 py-2.5 outline-none",
      },
    },
    onUpdate: ({ editor }) => setJson(editor.isEmpty ? "" : JSON.stringify(editor.getJSON())),
  });

  const active = useEditorState({
    editor,
    selector: ({ editor: e }) =>
      e
        ? {
            bold: e.isActive("bold"),
            italic: e.isActive("italic"),
            underline: e.isActive("underline"),
            strike: e.isActive("strike"),
            h2: e.isActive("heading", { level: 2 }),
            h3: e.isActive("heading", { level: 3 }),
            bullet: e.isActive("bulletList"),
            ordered: e.isActive("orderedList"),
            quote: e.isActive("blockquote"),
            link: e.isActive("link"),
          }
        : null,
  });

  const buttons: { key: string; icon: LucideIcon; label: string; on?: boolean; run: () => void }[] =
    editor
      ? [
          {
            key: "bold",
            icon: BoldIcon,
            label: labels.bold,
            on: active?.bold,
            run: () => editor.chain().focus().toggleBold().run(),
          },
          {
            key: "italic",
            icon: ItalicIcon,
            label: labels.italic,
            on: active?.italic,
            run: () => editor.chain().focus().toggleItalic().run(),
          },
          {
            key: "underline",
            icon: UnderlineIcon,
            label: labels.underline,
            on: active?.underline,
            run: () => editor.chain().focus().toggleUnderline().run(),
          },
          {
            key: "strike",
            icon: StrikethroughIcon,
            label: labels.strike,
            on: active?.strike,
            run: () => editor.chain().focus().toggleStrike().run(),
          },
          {
            key: "h2",
            icon: Heading2Icon,
            label: labels.heading,
            on: active?.h2,
            run: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
          },
          {
            key: "h3",
            icon: Heading3Icon,
            label: labels.subheading,
            on: active?.h3,
            run: () => editor.chain().focus().toggleHeading({ level: 3 }).run(),
          },
          {
            key: "bullet",
            icon: ListIcon,
            label: labels.bulletList,
            on: active?.bullet,
            run: () => editor.chain().focus().toggleBulletList().run(),
          },
          {
            key: "ordered",
            icon: ListOrderedIcon,
            label: labels.orderedList,
            on: active?.ordered,
            run: () => editor.chain().focus().toggleOrderedList().run(),
          },
          {
            key: "quote",
            icon: QuoteIcon,
            label: labels.quote,
            on: active?.quote,
            run: () => editor.chain().focus().toggleBlockquote().run(),
          },
          {
            key: "link",
            icon: LinkIcon,
            label: active?.link ? labels.removeLink : labels.link,
            on: active?.link,
            run: () => {
              if (editor.isActive("link")) return editor.chain().focus().unsetLink().run();
              const href = window.prompt(labels.linkPrompt)?.trim();
              if (href) editor.chain().focus().extendMarkRange("link").setLink({ href }).run();
            },
          },
          {
            key: "undo",
            icon: Undo2Icon,
            label: labels.undo,
            run: () => editor.chain().focus().undo().run(),
          },
          {
            key: "redo",
            icon: Redo2Icon,
            label: labels.redo,
            run: () => editor.chain().focus().redo().run(),
          },
        ]
      : [];

  return (
    <div
      className={cn(
        "rounded-md border bg-background focus-within:ring-[3px] focus-within:ring-ring/50",
        invalid && "border-destructive",
      )}
    >
      <div
        role="toolbar"
        aria-label={labels.toolbar}
        className="flex flex-wrap gap-0.5 border-b p-1"
      >
        {buttons.map((b) => (
          <button
            key={b.key}
            type="button"
            onClick={b.run}
            aria-label={b.label}
            title={b.label}
            aria-pressed={b.on ?? undefined}
            className={cn(
              "flex size-8 items-center justify-center rounded-sm text-muted-foreground hover:bg-accent hover:text-foreground",
              b.on && "bg-accent text-foreground",
            )}
          >
            <b.icon className="size-4" aria-hidden="true" />
          </button>
        ))}
      </div>
      <EditorContent editor={editor} />
      <input type="hidden" name={name} value={json} />
    </div>
  );
}
