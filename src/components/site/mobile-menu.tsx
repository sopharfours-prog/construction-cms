"use client";

import { MenuIcon } from "lucide-react";
import Link from "next/link";
import type { Route } from "next";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

type Item = { href: string; label: string };

export function MobileMenu({
  items,
  cta,
  secondary,
  title,
  labels,
  search,
  children,
}: {
  items: Item[];
  cta: Item;
  /** Extra action under the main one (registration). */
  secondary?: Item | null;
  title: string;
  labels: { openMenu: string; mainNav: string };
  /** Shown above the links (the site search). */
  search?: React.ReactNode;
  children?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="lg:hidden" aria-label={labels.openMenu}>
          <MenuIcon aria-hidden="true" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full max-w-sm">
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
          <SheetDescription className="sr-only">{labels.mainNav}</SheetDescription>
        </SheetHeader>
        {search ? <div className="px-4 pb-2">{search}</div> : null}
        <nav aria-label={labels.mainNav} className="grid gap-1 px-4">
          {items.map((item) => {
            const active =
              pathname === item.href ||
              (item.href.split("/").length > 2 && pathname.startsWith(`${item.href}/`));
            return (
              <Link
                key={item.href}
                href={item.href as Route}
                onClick={() => setOpen(false)}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "rounded-md px-3 py-3 text-lg font-medium hover:bg-accent",
                  active && "bg-accent",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto grid gap-4 p-4">
          {children}
          <Button asChild size="lg">
            <Link href={cta.href as Route} onClick={() => setOpen(false)}>
              {cta.label}
            </Link>
          </Button>
          {secondary ? (
            <Button asChild size="lg" variant="outline">
              <Link href={secondary.href as Route}>{secondary.label}</Link>
            </Button>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}
