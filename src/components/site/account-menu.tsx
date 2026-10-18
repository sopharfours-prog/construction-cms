"use client";

import {
  CircleUserIcon,
  LayoutDashboardIcon,
  LogInIcon,
  LogOutIcon,
  UserPlusIcon,
  UserRoundIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Messages } from "@/i18n/messages";
import { logoutAction } from "@/server/actions/auth";

type Me = { name: string; avatarUrl: string | null };

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

/**
 * "Log in / Register" for company staff, or the signed-in person's name with
 * their profile, the CMS and sign-out. Public pages are cached, so who is
 * signed in is asked from the browser (GET /api/account/me), never rendered.
 */
export function AccountMenu({
  registrationOpen,
  labels,
}: {
  registrationOpen: boolean;
  labels: Messages["site"]["account"];
}) {
  const pathname = usePathname();
  // undefined while asking: shown as signed out (most visitors are).
  const [me, setMe] = useState<Me | null | undefined>(undefined);

  // Asked again on every navigation, so signing in or out (here or in another
  // tab) shows up without a full reload.
  useEffect(() => {
    let cancelled = false;
    fetch("/api/account/me", { cache: "no-store" })
      .then((res) => (res.ok ? (res.json() as Promise<{ user: Me | null }>) : { user: null }))
      .then((data) => !cancelled && setMe(data.user))
      .catch(() => !cancelled && setMe(null));
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  if (me) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="h-9 gap-2 px-1.5"
            aria-label={`${labels.menu}: ${me.name}`}
          >
            <Avatar className="size-7">
              {me.avatarUrl ? <AvatarImage src={me.avatarUrl} alt="" /> : null}
              <AvatarFallback className="bg-brand text-[11px] font-semibold text-brand-foreground">
                {initials(me.name)}
              </AvatarFallback>
            </Avatar>
            <span className="hidden max-w-32 truncate xl:inline">{me.name}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="truncate">{me.name}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href="/admin/account">
              <CircleUserIcon aria-hidden="true" />
              {labels.profile}
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/admin">
              <LayoutDashboardIcon aria-hidden="true" />
              {labels.cms}
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <form action={logoutAction} onSubmit={() => setMe(null)}>
            {/* Back to this page after signing out. */}
            <input type="hidden" name="redirectTo" value={pathname} />
            <DropdownMenuItem asChild variant="destructive">
              <button type="submit" className="w-full">
                <LogOutIcon aria-hidden="true" />
                {labels.signOut}
              </button>
            </DropdownMenuItem>
          </form>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  const label = registrationOpen ? labels.loginRegister : labels.login;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="h-9 gap-2 px-2.5 xl:px-3" aria-label={label}>
          <UserRoundIcon aria-hidden="true" />
          <span className="hidden xl:inline">{label}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
          {labels.staffHint}
        </DropdownMenuLabel>
        <DropdownMenuItem asChild>
          <Link href="/admin/login">
            <LogInIcon aria-hidden="true" />
            {labels.login}
          </Link>
        </DropdownMenuItem>
        {registrationOpen ? (
          <DropdownMenuItem asChild>
            <Link href="/admin/register">
              <UserPlusIcon aria-hidden="true" />
              {labels.register}
            </Link>
          </DropdownMenuItem>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
