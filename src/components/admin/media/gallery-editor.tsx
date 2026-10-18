"use client";

import { ArrowDownIcon, ArrowUpIcon, ImagePlusIcon, Trash2Icon } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { locales, localeConfig, type Locale } from "@/config/i18n";
import type { AdminMessages } from "@/i18n/admin";

import { MediaPicker, type PickedImage } from "./media-picker";
import { MediaThumb } from "./media-thumb";

export type GalleryItem = {
  media: PickedImage;
  translations: Partial<Record<Locale, { altText: string; caption: string }>>;
};

type Props = {
  name: string;
  defaultValue: GalleryItem[];
  labels: Pick<AdminMessages, "common" | "validation" | "media" | "projects">;
  max?: number;
};

/** Ordered gallery with per-language alt text and captions, submitted as name.N.* fields. */
export function GalleryEditor({ name, defaultValue, labels, max = 60 }: Props) {
  const [items, setItems] = useState(defaultValue);
  const [open, setOpen] = useState(false);
  const g = labels.projects.gallery;
  const c = labels.common;

  const move = (index: number, delta: number) =>
    setItems((current) => {
      const next = [...current];
      const [item] = next.splice(index, 1);
      next.splice(index + delta, 0, item!);
      return next;
    });

  return (
    <div className="grid gap-4">
      {items.length === 0 ? <p className="text-sm text-muted-foreground">{g.empty}</p> : null}
      <ol className="grid gap-3">
        {items.map((item, index) => (
          <li
            key={item.media.id}
            className="grid grid-cols-1 gap-3 rounded-md border p-3 sm:grid-cols-[8rem_1fr_auto]"
          >
            <input type="hidden" name={`${name}.${index}.mediaId`} value={item.media.id} />
            <MediaThumb media={item.media} sizes="128px" className="w-32 rounded" />
            <div className="grid gap-2">
              {locales.map((locale) => (
                <div key={locale} className="grid grid-cols-1 gap-2 sm:grid-cols-2" lang={locale}>
                  <Input
                    name={`${name}.${index}.translations.${locale}.altText`}
                    defaultValue={item.translations[locale]?.altText ?? ""}
                    placeholder={`${g.altText} (${localeConfig[locale].nativeName})`}
                    aria-label={`${g.altText} (${localeConfig[locale].nativeName}) ${index + 1}`}
                    maxLength={255}
                  />
                  <Input
                    name={`${name}.${index}.translations.${locale}.caption`}
                    defaultValue={item.translations[locale]?.caption ?? ""}
                    placeholder={`${g.caption} (${localeConfig[locale].nativeName})`}
                    aria-label={`${g.caption} (${localeConfig[locale].nativeName}) ${index + 1}`}
                    maxLength={500}
                  />
                </div>
              ))}
            </div>
            <div className="flex sm:flex-col">
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                disabled={index === 0}
                onClick={() => move(index, -1)}
                aria-label={c.moveUp}
              >
                <ArrowUpIcon aria-hidden="true" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                disabled={index === items.length - 1}
                onClick={() => move(index, 1)}
                aria-label={c.moveDown}
              >
                <ArrowDownIcon aria-hidden="true" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => setItems((list) => list.filter((x) => x.media.id !== item.media.id))}
                aria-label={c.remove}
              >
                <Trash2Icon aria-hidden="true" />
              </Button>
            </div>
          </li>
        ))}
      </ol>
      <Button
        type="button"
        variant="outline"
        className="w-fit"
        disabled={items.length >= max}
        onClick={() => setOpen(true)}
      >
        <ImagePlusIcon aria-hidden="true" />
        {g.add}
      </Button>
      <MediaPicker
        open={open}
        onOpenChange={setOpen}
        multiple
        labels={labels}
        onSelect={(picked) =>
          setItems((current) => {
            const existing = new Set(current.map((i) => i.media.id));
            const added = picked
              .filter((p) => !existing.has(p.id))
              .map((media) => ({ media, translations: {} }));
            return [...current, ...added].slice(0, max);
          })
        }
      />
    </div>
  );
}
