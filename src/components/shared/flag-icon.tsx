import { useId } from "react";

import type { Locale } from "@/config/i18n";
import { cn } from "@/lib/utils";

/**
 * National flag for a site language, drawn inline: emoji flags don't render
 * on Windows (they show as "LA"), and an inline SVG needs no network request.
 * Decorative: the link around it carries the language name.
 */
export function FlagIcon({ locale, className }: { locale: Locale; className?: string }) {
  const id = useId();
  const box = cn(
    "block h-4 w-6 shrink-0 overflow-hidden rounded-[2px] shadow-[0_0_0_1px_rgb(0_0_0/0.12)]",
    className,
  );

  if (locale === "lo") {
    // Laos: red, double-height blue, red; a white disc 4/5 of the blue band's height.
    return (
      <svg viewBox="0 0 30 20" aria-hidden="true" focusable="false" className={box}>
        <rect width="30" height="20" fill="#CE1126" />
        <rect y="5" width="30" height="10" fill="#002868" />
        <circle cx="15" cy="10" r="4" fill="#FFFFFF" />
      </svg>
    );
  }

  // English: the United Kingdom's Union Flag (2:1, cropped to the same 3:2 box).
  const clip = `${id}-clip`;
  const diagonals = `${id}-diagonals`;
  return (
    <svg
      viewBox="0 0 60 30"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      focusable="false"
      className={box}
    >
      <clipPath id={clip}>
        <path d="M0,0 v30 h60 v-30 z" />
      </clipPath>
      <clipPath id={diagonals}>
        <path d="M30,15 h30 v15 z v15 h-30 z h-30 v-15 z v-15 h30 z" />
      </clipPath>
      <g clipPath={`url(#${clip})`}>
        <path d="M0,0 v30 h60 v-30 z" fill="#012169" />
        <path d="M0,0 L60,30 M60,0 L0,30" stroke="#FFFFFF" strokeWidth="6" />
        <path
          d="M0,0 L60,30 M60,0 L0,30"
          clipPath={`url(#${diagonals})`}
          stroke="#C8102E"
          strokeWidth="4"
        />
        <path d="M30,0 v30 M0,15 h60" stroke="#FFFFFF" strokeWidth="10" />
        <path d="M30,0 v30 M0,15 h60" stroke="#C8102E" strokeWidth="6" />
      </g>
    </svg>
  );
}
