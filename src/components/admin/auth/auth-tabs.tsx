"use client";

import Link from "next/link";
import type { Route } from "next";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

/**
 * "Sign in | Register" at the top of the card, on those two pages only. Two
 * links styled as tabs: each page has its own address, so back/forward and
 * shared links behave as expected.
 */
export function AuthTabs({
  registrationOpen,
  labels,
}: {
  registrationOpen: boolean;
  labels: { tabsLabel: string; signIn: string; register: string };
}) {
  const pathname = usePathname();
  const tabs = [
    { href: "/admin/login", label: labels.signIn },
    ...(registrationOpen ? [{ href: "/admin/register", label: labels.register }] : []),
  ];
  if (tabs.length < 2 || !tabs.some((t) => t.href === pathname)) return null;

  return (
    <nav aria-label={labels.tabsLabel} className="mb-7 grid grid-cols-2 rounded-lg bg-muted p-1">
      {tabs.map((tab) => {
        const active = tab.href === pathname;
        return (
          <Link
            key={tab.href}
            href={tab.href as Route}
            aria-current={active ? "page" : undefined}
            className={cn(
              "rounded-md px-3 py-2 text-center text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
              active
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
