"use client";

import { ImageIcon, XIcon } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import type { AdminMessages } from "@/i18n/admin";

import { MediaPicker, type PickedImage } from "./media-picker";
import { MediaThumb } from "./media-thumb";

type Props = {
  name: string;
  label: string;
  hint?: string;
  error?: string;
  defaultValue: PickedImage | null;
  labels: Pick<AdminMessages, "common" | "validation" | "media">;
};

/** Single image (cover, share image): preview, choose/change/remove, hidden input with the media id. */
export function MediaField({ name, label, hint, error, defaultValue, labels }: Props) {
  const [value, setValue] = useState<PickedImage | null>(defaultValue);
  const [open, setOpen] = useState(false);
  const id = `f-${name}`;
  const p = labels.media.picker;

  return (
    <div className="grid gap-1.5" role="group" aria-labelledby={`${id}-label`}>
      <p id={`${id}-label`} className="text-sm font-medium">
        {label}
      </p>
      <input type="hidden" name={name} value={value?.id ?? ""} />
      {value ? (
        <div className="relative w-full max-w-xs overflow-hidden rounded-md border">
          <MediaThumb media={value} sizes="320px" className="aspect-video" />
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex aspect-video w-full max-w-xs flex-col items-center justify-center gap-2 rounded-md border border-dashed text-sm text-muted-foreground hover:border-primary hover:text-foreground"
        >
          <ImageIcon className="size-6" aria-hidden="true" />
          {p.select}
        </button>
      )}
      <div className="flex gap-2">
        <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
          {value ? p.change : p.select}
        </Button>
        {value ? (
          <Button type="button" variant="ghost" size="sm" onClick={() => setValue(null)}>
            <XIcon aria-hidden="true" />
            {p.remove}
          </Button>
        ) : null}
      </div>
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      <MediaPicker
        open={open}
        onOpenChange={setOpen}
        onSelect={(items) => items[0] && setValue(items[0])}
        labels={labels}
      />
    </div>
  );
}
