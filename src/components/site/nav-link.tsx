"use client";

import Link from "next/link";
import type { Route } from "next";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

/** Header link that marks the current section (aria-current). */
export function NavLink({
  href,
  children,
  exact = false,
}: {
  href: string;
  children: React.ReactNode;
  exact?: boolean;
}) {
  const pathname = usePathname();
  const active = exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
  return (
    <Link
      href={href as Route}
      aria-current={active ? "page" : undefined}
      className={cn(
        "relative py-2 text-sm font-medium whitespace-nowrap text-foreground/75 transition-colors hover:text-foreground",
        "after:absolute after:inset-x-0 after:-bottom-0.5 after:h-0.5 after:origin-left after:scale-x-0 after:bg-highlight after:transition-transform",
        active && "text-foreground after:scale-x-100",
      )}
    >
      {children}
    </Link>
  );
}
