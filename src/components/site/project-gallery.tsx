"use client";

import { ChevronLeftIcon, ChevronRightIcon, XIcon } from "lucide-react";
import Image from "next/image";
import { useCallback, useRef, useState } from "react";

import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { fmt } from "@/i18n/format";
import type { Messages } from "@/i18n/messages";
import type { PublicImage } from "@/server/public/content";

type Item = PublicImage & { caption: string | null };

/** Thumbnail grid + full-screen viewer (keyboard arrows, swipe, Esc, focus trapped). */
export function ProjectGallery({
  items,
  title,
  t,
}: {
  items: Item[];
  title: string;
  t: Messages["public"]["gallery"];
}) {
  const [index, setIndex] = useState<number | null>(null);
  const touchX = useRef<number | null>(null);
  const total = items.length;
  const go = useCallback(
    (delta: number) => setIndex((i) => (i === null ? i : (i + delta + total) % total)),
    [total],
  );
  const current = index === null ? null : items[index];

  return (
    <>
      <ul
        className={
          total === 1
            ? "grid max-w-4xl"
            : total === 2
              ? "grid grid-cols-2 gap-2 lg:gap-3"
              : "grid grid-cols-2 gap-2 md:grid-cols-3 lg:gap-3"
        }
      >
        {items.map((item, i) => (
          <li key={item.url} className={i === 0 && total > 2 ? "col-span-2 row-span-2" : undefined}>
            <button
              type="button"
              onClick={() => setIndex(i)}
              className="group relative block aspect-[4/3] size-full overflow-hidden bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              aria-label={fmt(t.open, { index: i + 1, total })}
            >
              <Image
                src={item.url}
                alt={item.altText || title}
                fill
                sizes={
                  total === 1
                    ? "(min-width: 1024px) 56rem, 100vw"
                    : i === 0 && total > 2
                      ? "(min-width: 768px) 66vw, 100vw"
                      : total === 2
                        ? "50vw"
                        : "(min-width: 768px) 33vw, 50vw"
                }
                placeholder={item.blurDataUrl ? "blur" : "empty"}
                blurDataURL={item.blurDataUrl ?? undefined}
                className="object-cover transition-transform duration-500 group-hover:scale-105"
              />
            </button>
          </li>
        ))}
      </ul>

      <Dialog open={index !== null} onOpenChange={(open) => !open && setIndex(null)}>
        <DialogContent
          showCloseButton={false}
          className="flex h-dvh max-h-dvh w-screen max-w-none flex-col gap-0 rounded-none border-0 bg-black/95 p-0 text-white sm:max-w-none"
          onKeyDown={(e) => {
            if (e.key === "ArrowRight") go(1);
            if (e.key === "ArrowLeft") go(-1);
          }}
        >
          <DialogTitle className="sr-only">{title}</DialogTitle>
          <DialogDescription className="sr-only">{t.dialog}</DialogDescription>
          <div className="flex items-center justify-between px-4 py-3 text-sm">
            <span aria-live="polite" className="tabular-nums">
              {index !== null ? fmt(t.counter, { index: index + 1, total }) : null}
            </span>
            <button
              type="button"
              onClick={() => setIndex(null)}
              className="flex size-10 items-center justify-center rounded-full hover:bg-white/10"
              aria-label={t.close}
            >
              <XIcon aria-hidden="true" />
            </button>
          </div>
          <div
            className="relative flex-1"
            onTouchStart={(e) => (touchX.current = e.touches[0]?.clientX ?? null)}
            onTouchEnd={(e) => {
              const start = touchX.current;
              const end = e.changedTouches[0]?.clientX;
              if (start !== null && end !== undefined && Math.abs(end - start) > 50)
                go(end < start ? 1 : -1);
              touchX.current = null;
            }}
          >
            {current ? (
              <Image
                key={current.url}
                src={current.url}
                alt={current.altText || title}
                fill
                sizes="100vw"
                className="object-contain"
              />
            ) : null}
            {total > 1 ? (
              <>
                <button
                  type="button"
                  onClick={() => go(-1)}
                  className="absolute top-1/2 left-2 flex size-12 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 hover:bg-black/70"
                  aria-label={t.previous}
                >
                  <ChevronLeftIcon aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => go(1)}
                  className="absolute top-1/2 right-2 flex size-12 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 hover:bg-black/70"
                  aria-label={t.next}
                >
                  <ChevronRightIcon aria-hidden="true" />
                </button>
              </>
            ) : null}
          </div>
          <p className="min-h-12 px-4 py-3 text-center text-sm text-white/80">
            {current?.caption ?? ""}
          </p>
        </DialogContent>
      </Dialog>
    </>
  );
}
