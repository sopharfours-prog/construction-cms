import type { Route } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";

export type ToolbarSelect = {
  name: string;
  label: string;
  value?: string;
  /** First option (value ""); omit for selects that always have a value, like sort. */
  allLabel?: string;
  options: { value: string; label: string }[];
};

type ListToolbarProps = {
  basePath: string;
  search: { value?: string; placeholder: string; label: string };
  selects: ToolbarSelect[];
  labels: { apply: string; clear: string };
  hasFilters: boolean;
  /** Extra values kept when filtering (e.g. the current folder). */
  hidden?: Record<string, string>;
};

/** GET filter form: works without JavaScript, filters live in the URL. */
export function ListToolbar({
  basePath,
  search,
  selects,
  labels,
  hasFilters,
  hidden,
}: ListToolbarProps) {
  return (
    <form
      method="get"
      role="search"
      className="mb-4 flex flex-col gap-2 lg:flex-row lg:flex-wrap lg:items-center"
    >
      {Object.entries(hidden ?? {}).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      <label className="sr-only" htmlFor="list-q">
        {search.label}
      </label>
      <Input
        id="list-q"
        type="search"
        name="q"
        defaultValue={search.value}
        placeholder={search.placeholder}
        className="lg:w-72"
      />
      <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
        {selects.map((select) => (
          <div key={select.name}>
            <label className="sr-only" htmlFor={`list-${select.name}`}>
              {select.label}
            </label>
            <NativeSelect
              id={`list-${select.name}`}
              name={select.name}
              defaultValue={select.value ?? ""}
              className="w-full sm:w-auto"
            >
              {select.allLabel !== undefined ? (
                <NativeSelectOption value="">{select.allLabel}</NativeSelectOption>
              ) : null}
              {select.options.map((o) => (
                <NativeSelectOption key={o.value} value={o.value}>
                  {o.label}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <Button type="submit" variant="secondary">
          {labels.apply}
        </Button>
        {hasFilters ? (
          <Button asChild variant="ghost">
            <Link href={basePath as Route}>{labels.clear}</Link>
          </Button>
        ) : null}
      </div>
    </form>
  );
}
