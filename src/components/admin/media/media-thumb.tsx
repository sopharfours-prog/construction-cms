import { FileSpreadsheetIcon, FileTextIcon, FilmIcon } from "lucide-react";
import Image from "next/image";

import { cn } from "@/lib/utils";

type Thumb = {
  kind: string;
  url: string;
  altText: string | null;
  originalName: string;
  mimeType: string;
  blurDataUrl: string | null;
};

/** Square preview: optimized image, or an icon for videos and documents. */
export function MediaThumb({
  media,
  sizes,
  className,
}: {
  media: Thumb;
  sizes: string;
  className?: string;
}) {
  if (media.kind === "IMAGE") {
    return (
      <div className={cn("relative aspect-square overflow-hidden bg-muted", className)}>
        <Image
          src={media.url}
          alt={media.altText ?? ""}
          fill
          sizes={sizes}
          className="object-cover"
          placeholder={media.blurDataUrl ? "blur" : "empty"}
          blurDataURL={media.blurDataUrl ?? undefined}
        />
      </div>
    );
  }
  const Icon =
    media.kind === "VIDEO"
      ? FilmIcon
      : media.mimeType.includes("sheet")
        ? FileSpreadsheetIcon
        : FileTextIcon;
  const ext = media.originalName.split(".").pop()?.toUpperCase().slice(0, 5);
  return (
    <div
      className={cn(
        "flex aspect-square flex-col items-center justify-center gap-2 bg-muted text-muted-foreground",
        className,
      )}
    >
      <Icon className="size-10" aria-hidden="true" />
      {ext ? <span className="text-xs font-semibold tracking-wide">{ext}</span> : null}
    </div>
  );
}
