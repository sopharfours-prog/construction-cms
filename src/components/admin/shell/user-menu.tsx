"use client";

import { ChevronRightIcon, CircleUserIcon, ExternalLinkIcon, LogOutIcon } from "lucide-react";
import Link from "next/link";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { logoutAction } from "@/server/actions/auth";

type UserMenuProps = {
  user: { name: string; email: string; roleName: string; avatarUrl: string | null };
  labels: {
    account: string;
    myAccount: string;
    signOut: string;
    viewSite: string;
  };
};

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

export function UserMenu({ user, labels }: UserMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="h-9 gap-2 px-1.5"
          aria-label={`${labels.account}: ${user.name}`}
        >
          <Avatar className="size-7">
            {user.avatarUrl ? <AvatarImage src={user.avatarUrl} alt="" /> : null}
            <AvatarFallback className="bg-primary text-[11px] font-semibold text-primary-foreground">
              {initials(user.name)}
            </AvatarFallback>
          </Avatar>
          <span className="hidden max-w-32 truncate text-sm font-medium lg:inline">
            {user.name}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        {/* Who you are, and the way to your profile. */}
        <DropdownMenuItem asChild className="items-start gap-3 py-2">
          <Link href="/admin/account" aria-label={`${labels.myAccount}: ${user.name}`}>
            <Avatar className="size-9">
              {user.avatarUrl ? <AvatarImage src={user.avatarUrl} alt="" /> : null}
              <AvatarFallback className="bg-primary text-xs font-semibold text-primary-foreground">
                {initials(user.name)}
              </AvatarFallback>
            </Avatar>
            <span className="grid min-w-0 flex-1">
              <span className="truncate font-semibold">{user.name}</span>
              <span className="truncate text-xs text-muted-foreground">{user.email}</span>
              <span className="text-xs text-muted-foreground">{user.roleName}</span>
              <span className="mt-1 flex items-center gap-1 text-xs font-medium text-primary">
                <CircleUserIcon className="size-3.5" aria-hidden="true" />
                {labels.myAccount}
                <ChevronRightIcon className="size-3.5" aria-hidden="true" />
              </span>
            </span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <a href="/" target="_blank" rel="noopener">
            <ExternalLinkIcon aria-hidden="true" />
            {labels.viewSite}
          </a>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <form action={logoutAction}>
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
