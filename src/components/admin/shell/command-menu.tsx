"use client";

import { SearchIcon } from "lucide-react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import type { VisibleNavGroup } from "@/lib/admin/nav";

import { NavIcon } from "./nav-icon";

type CommandMenuProps = {
  nav: VisibleNavGroup[];
  labels: {
    search: string;
    searchShortcut: string;
    searchPlaceholder: string;
    searchEmpty: string;
  };
};

/** Ctrl/⌘ K quick navigation between the sections this user can open. */
export function CommandMenu({ nav, labels }: CommandMenuProps) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key.toLowerCase() === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setOpen((value) => !value);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <>
      <Button
        variant="outline"
        onClick={() => setOpen(true)}
        className="h-9 w-9 justify-center p-0 text-muted-foreground sm:w-56 sm:justify-start sm:px-3 lg:w-72"
        aria-label={labels.search}
      >
        <SearchIcon aria-hidden="true" />
        <span className="hidden sm:inline">{labels.search}</span>
        <kbd className="ml-auto hidden rounded-sm border bg-muted px-1.5 text-[11px] font-medium sm:inline">
          {labels.searchShortcut}
        </kbd>
      </Button>
      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        title={labels.search}
        description={labels.searchPlaceholder}
      >
        <CommandInput placeholder={labels.searchPlaceholder} />
        <CommandList>
          <CommandEmpty>{labels.searchEmpty}</CommandEmpty>
          {nav.map((group) => {
            // Sub-menu entries (Settings › Contact, …) are listed too, so they can be searched.
            const items = group.items.flatMap((item) =>
              item.href
                ? [
                    item,
                    ...(item.children ?? []).map((child) => ({
                      ...item,
                      key: `${item.key}-${child.key}`,
                      label: `${item.label} › ${child.label}`,
                      href: child.href,
                    })),
                  ]
                : [],
            );
            if (items.length === 0) return null;
            return (
              <CommandGroup key={group.key} heading={group.label}>
                {items.map((item) => (
                  <CommandItem
                    key={item.key}
                    value={`${item.label} ${item.key}`}
                    onSelect={() => {
                      setOpen(false);
                      router.push(item.href as Route);
                    }}
                  >
                    <NavIcon name={item.icon} />
                    {item.label}
                  </CommandItem>
                ))}
              </CommandGroup>
            );
          })}
        </CommandList>
      </CommandDialog>
    </>
  );
}
