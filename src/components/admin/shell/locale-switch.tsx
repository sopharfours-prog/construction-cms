"use client";

import { CheckIcon, ChevronDownIcon } from "lucide-react";
import { useTransition } from "react";

import { FlagIcon } from "@/components/shared/flag-icon";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Spinner } from "@/components/ui/spinner";
import type { Locale } from "@/config/i18n";
import { setAdminLocaleAction } from "@/server/actions/preferences";

type LocaleSwitchProps = {
  current: Locale;
  options: { locale: Locale; label: string; nativeName: string }[];
  label: string;
};

/**
 * CMS language menu: the current flag, opening the languages with their flags
 * (the same look as the public site). Saves to a cookie and the profile.
 */
export function LocaleSwitch({ current, options, label }: LocaleSwitchProps) {
  const [pending, startTransition] = useTransition();
  const active = options.find((o) => o.locale === current) ?? options[0]!;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="h-9 gap-1.5 px-2"
          disabled={pending}
          aria-busy={pending}
          aria-label={`${label}: ${active.nativeName}`}
        >
          {pending ? <Spinner aria-hidden="true" /> : <FlagIcon locale={active.locale} />}
          <span className="text-xs font-semibold">{active.label}</span>
          <ChevronDownIcon className="size-3.5 opacity-60" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-44">
        {options.map((option) => {
          const selected = option.locale === current;
          return (
            <DropdownMenuItem
              key={option.locale}
              lang={option.locale}
              aria-current={selected ? "true" : undefined}
              disabled={selected}
              className="data-[disabled]:opacity-100"
              onSelect={() => startTransition(() => setAdminLocaleAction(option.locale))}
            >
              <FlagIcon locale={option.locale} />
              <span className={selected ? "flex-1 font-medium" : "flex-1"}>
                {option.nativeName}
              </span>
              {selected ? <CheckIcon className="text-primary" aria-hidden="true" /> : null}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
