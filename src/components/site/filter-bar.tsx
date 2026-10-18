import { SearchIcon } from "lucide-react";
import Link from "next/link";
import type { Route } from "next";

import { Button } from "@/components/ui/button";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";

type Select = {
  name: string;
  label: string;
  value?: string;
  allLabel: string;
  options: { value: string; label: string }[];
};

/** GET filter form (works without JavaScript; filters live in the URL, so results can be shared). */
export function FilterBar({
  action,
  search,
  selects,
  labels,
  active,
}: {
  action: string;
  search?: { value?: string; placeholder: string };
  selects: Select[];
  labels: { search: string; apply: string; clear: string };
  active: boolean;
}) {
  return (
    <form
      method="get"
      action={action}
      role="search"
      className="grid grid-cols-1 gap-3 border bg-card p-4 md:grid-cols-[minmax(0,2fr)_repeat(3,minmax(0,1fr))_auto] md:items-end"
    >
      {search ? (
        <label className="grid gap-1.5 text-sm font-medium">
          {labels.search}
          <span className="relative">
            <SearchIcon
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <input
              type="search"
              name="q"
              defaultValue={search.value}
              placeholder={search.placeholder}
              maxLength={100}
              className="h-10 w-full rounded-md border bg-background pr-3 pl-9 text-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
            />
          </span>
        </label>
      ) : null}
      {selects.map((s) => (
        <label key={s.name} className="grid gap-1.5 text-sm font-medium">
          {s.label}
          <NativeSelect name={s.name} defaultValue={s.value ?? ""} className="h-10 w-full">
            <NativeSelectOption value="">{s.allLabel}</NativeSelectOption>
            {s.options.map((o) => (
              <NativeSelectOption key={o.value} value={o.value}>
                {o.label}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </label>
      ))}
      <div className="flex gap-2">
        <Button type="submit" className="h-10">
          {labels.apply}
        </Button>
        {active ? (
          <Button asChild variant="ghost" className="h-10">
            <Link href={action as Route}>{labels.clear}</Link>
          </Button>
        ) : null}
      </div>
    </form>
  );
}
