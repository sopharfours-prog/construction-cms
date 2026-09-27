"use client";

import { useTransition } from "react";

import type { Locale } from "@/config/i18n";
import { cn } from "@/lib/utils";
import { setAdminLocaleAction } from "@/server/actions/preferences";

type LocaleSwitchProps = {
  current: Locale;
  options: { locale: Locale; label: string; nativeName: string }[];
  label: string;
};

/** LO | EN segmented switch. Saves the choice to a cookie and the user's profile. */
export function LocaleSwitch({ current, options, label }: LocaleSwitchProps) {
  const [pending, startTransition] = useTransition();

  return (
    <div
      role="group"
      aria-label={label}
      className="flex rounded-md border p-0.5"
      aria-busy={pending}
    >
      {options.map((option) => {
        const active = option.locale === current;
        return (
          <button
            key={option.locale}
            type="button"
            lang={option.locale}
            aria-pressed={active}
            title={option.nativeName}
            disabled={pending}
            onClick={() => !active && startTransition(() => setAdminLocaleAction(option.locale))}
            className={cn(
              "h-7 min-w-9 rounded-sm px-2 text-xs font-semibold transition-colors disabled:opacity-60",
              active
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
