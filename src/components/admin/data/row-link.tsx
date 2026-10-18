import type { LucideIcon } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Clickable table rows for queues that need answering (chats, inquiries,
 * quotes, account requests). The row gets `relative` (see rowLinkClass); its
 * main text becomes a link whose ::after covers the whole row, so a click
 * anywhere opens the item.
 */
export const rowLinkClass = "relative cursor-pointer";

/**
 * The row-covering link. `accessible={false}` hides it from keyboard and
 * screen readers when the row's RowAction already links to the same place,
 * so nobody tabs through two links to one page.
 */
export function RowCoverLink({
  href,
  accessible = true,
  className,
  children,
}: {
  href: string;
  accessible?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href as Route}
      {...(accessible ? {} : { tabIndex: -1, "aria-hidden": true })}
      className={cn(
        "after:absolute after:inset-0 hover:underline focus-visible:outline-none after:focus-visible:ring-2 after:focus-visible:ring-ring after:focus-visible:ring-inset",
        className,
      )}
    >
      {children}
    </Link>
  );
}

/**
 * The row's action ("Reply", "Review"), above the covering link. Filled when
 * the item is waiting for someone; `name` is what screen readers announce.
 */
export function RowAction({
  href,
  label,
  name,
  icon: Icon,
  urgent,
}: {
  href: string;
  label: string;
  name: string;
  icon: LucideIcon;
  urgent: boolean;
}) {
  return (
    <Button asChild size="sm" variant={urgent ? "default" : "outline"} className="relative z-10">
      <Link href={href as Route} aria-label={name}>
        <Icon aria-hidden="true" />
        {label}
      </Link>
    </Button>
  );
}
