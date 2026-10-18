import { SearchIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * The site search bar: a white panel with the search icon, the field and the
 * button inside it. `lg` sits on the home and search-page heroes, `md` in the
 * search dialog and the phone menu. A plain GET form, so it works without
 * JavaScript and every search has a shareable address (/lo/search?q=…).
 */
export function SearchForm({
  id = "site-search",
  action,
  defaultValue,
  labels,
  size = "md",
  autoFocus,
  className,
}: {
  /** Unique per form on the page (the hero, the dialog and the phone menu). */
  id?: string;
  action: string;
  defaultValue?: string;
  labels: { label: string; placeholder: string; submit: string };
  size?: "md" | "lg";
  autoFocus?: boolean;
  className?: string;
}) {
  const lg = size === "lg";
  return (
    <form
      action={action}
      method="get"
      role="search"
      className={cn(
        "flex items-center gap-2 bg-white text-foreground ring-1 ring-black/10 transition-shadow focus-within:ring-2 focus-within:ring-ring dark:bg-card dark:ring-white/10",
        lg ? "rounded-2xl p-2 pl-5 shadow-xl sm:p-2.5 sm:pl-6" : "rounded-xl p-1.5 pl-3.5",
        className,
      )}
    >
      <SearchIcon
        aria-hidden="true"
        className={cn("shrink-0 text-muted-foreground", lg ? "size-6" : "size-5")}
      />
      <label htmlFor={id} className="sr-only">
        {labels.label}
      </label>
      <input
        id={id}
        type="search"
        name="q"
        defaultValue={defaultValue}
        placeholder={labels.placeholder}
        maxLength={100}
        autoComplete="off"
        autoFocus={autoFocus}
        className={cn(
          "min-w-0 flex-1 bg-transparent text-foreground outline-none placeholder:text-muted-foreground [&::-webkit-search-cancel-button]:hidden",
          lg ? "h-12 text-base sm:text-lg" : "h-10 text-base",
        )}
      />
      <Button
        type="submit"
        className={cn(
          "shrink-0 bg-brand font-semibold text-brand-foreground hover:bg-brand/90",
          lg ? "h-12 rounded-xl px-5 text-base sm:px-7" : "h-10 rounded-lg px-4",
        )}
      >
        {labels.submit}
      </Button>
    </form>
  );
}

/** Wraps every occurrence of `term` (any case) in <mark>. */
export function Highlight({ text, term }: { text: string; term: string }) {
  if (!term) return text;
  const pattern = new RegExp(`(${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
  return text.split(pattern).map((part, i) =>
    i % 2 === 1 ? (
      <mark key={i} className="rounded-sm bg-highlight/30 px-0.5 text-inherit">
        {part}
      </mark>
    ) : (
      part
    ),
  );
}
