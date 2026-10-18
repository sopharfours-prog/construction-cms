"use client";

import { ChevronRightIcon } from "lucide-react";
import type { Route } from "next";
import Image from "next/image";
import Link, { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";
import { Collapsible } from "radix-ui";
import { Fragment, useState } from "react";

import { Badge } from "@/components/ui/badge";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";
import { Spinner } from "@/components/ui/spinner";
import { isNavItemActive, type VisibleNavGroup, type VisibleNavItem } from "@/lib/admin/nav";
import { cn } from "@/lib/utils";

import { NavIcon } from "./nav-icon";
import { useNotifications } from "./notifications-provider";

/**
 * Confirms a click while the next page loads (most admin pages render on the
 * server before anything changes). Always rendered, so nothing shifts.
 */
function NavPending() {
  const { pending } = useLinkStatus();
  return (
    <Spinner
      aria-hidden="true"
      className={cn(
        "ml-auto size-3.5 opacity-0 transition-opacity group-data-[collapsible=icon]:hidden",
        pending && "opacity-70 delay-100",
      )}
    />
  );
}

type AppSidebarProps = {
  nav: VisibleNavGroup[];
  /** The company, shown at the top: name, logo (Website Settings) and "Content management". */
  brand: { name: string; logoUrl: string | null; subtitle: string };
  labels: {
    soon: string;
    soonHint: string;
    mainNavigation: string;
    subMenu: string;
    unread: string;
  };
};

/**
 * An item with a sub-menu (Website Settings and its sections). It opens by
 * itself when one of its pages is shown; the chevron opens or closes it. The
 * highlight sits on the current section while the sub-menu is visible, and on
 * the item itself when it is closed or the sidebar is collapsed to icons.
 */
function NavItemWithChildren({
  item,
  pathname,
  toggleLabel,
  onNavigate,
}: {
  item: VisibleNavItem & { href: string; children: NonNullable<VisibleNavItem["children"]> };
  pathname: string;
  toggleLabel: string;
  onNavigate: () => void;
}) {
  const { state, isMobile } = useSidebar();
  const active = isNavItemActive(item.href, pathname);
  const [open, setOpen] = useState(active);
  // Navigating into the section (from anywhere) opens the sub-menu.
  const [wasActive, setWasActive] = useState(active);
  if (active !== wasActive) {
    setWasActive(active);
    if (active) setOpen(true);
  }
  // The mobile drawer always shows labels, whatever the desktop sidebar is set to.
  const childVisible = open && (isMobile || state === "expanded");

  return (
    <Collapsible.Root open={open} onOpenChange={setOpen} asChild>
      <SidebarMenuItem>
        <SidebarMenuButton
          asChild
          isActive={active && !childVisible}
          tooltip={item.label}
          className={cn(activeClass, active && "font-medium")}
        >
          <Link href={item.children[0]!.href as Route} onClick={onNavigate}>
            <NavIcon name={item.icon} />
            <span>{item.label}</span>
            <NavPending />
          </Link>
        </SidebarMenuButton>
        <Collapsible.Trigger asChild>
          <SidebarMenuAction
            aria-label={`${item.label}: ${toggleLabel}`}
            className="transition-transform data-[state=open]:rotate-90"
          >
            <ChevronRightIcon aria-hidden="true" />
          </SidebarMenuAction>
        </Collapsible.Trigger>
        <Collapsible.Content>
          <SidebarMenuSub className="border-sidebar-border">
            {item.children.map((child) => {
              const current = isNavItemActive(child.href, pathname);
              return (
                <SidebarMenuSubItem key={child.key}>
                  <SidebarMenuSubButton
                    asChild
                    isActive={current}
                    className="data-[active=true]:bg-sidebar-accent data-[active=true]:font-medium data-[active=true]:shadow-[inset_3px_0_0_var(--sidebar-primary)]"
                  >
                    <Link
                      href={child.href as Route}
                      aria-current={current ? "page" : undefined}
                      onClick={onNavigate}
                    >
                      <span>{child.label}</span>
                      <NavPending />
                    </Link>
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
              );
            })}
          </SidebarMenuSub>
        </Collapsible.Content>
      </SidebarMenuItem>
    </Collapsible.Root>
  );
}

/** The current section: tinted, with an accent bar on the leading edge. */
const activeClass =
  "data-[active=true]:bg-sidebar-accent data-[active=true]:shadow-[inset_3px_0_0_var(--sidebar-primary)]";

export function AppSidebar({ nav, brand, labels }: AppSidebarProps) {
  const pathname = usePathname();
  const { isMobile, setOpenMobile } = useSidebar();
  // Unread chats next to "Live chat", from the same counts as the bell.
  const { summary } = useNotifications();
  const badgeFor = (key: string) => (key === "chats" && summary.newChats ? summary.newChats : 0);

  return (
    <Sidebar collapsible="icon" aria-label={labels.mainNavigation}>
      {/* The company: logo and name; opens the dashboard. */}
      <SidebarHeader className="border-b border-sidebar-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              size="lg"
              tooltip={brand.name}
              className="h-auto min-h-12 py-2"
            >
              <Link
                href="/admin"
                title={brand.name}
                onClick={() => isMobile && setOpenMobile(false)}
              >
                {brand.logoUrl ? (
                  // Logos are often drawn for a white page: a white tile keeps them legible.
                  <span className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-md bg-white p-0.5 group-data-[collapsible=icon]:size-8">
                    <Image
                      src={brand.logoUrl}
                      alt=""
                      width={64}
                      height={64}
                      className="max-h-full w-auto object-contain"
                    />
                  </span>
                ) : (
                  <span
                    aria-hidden="true"
                    className="flex size-10 shrink-0 items-center justify-center rounded-md bg-sidebar-primary text-lg type-heading text-sidebar-primary-foreground group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:text-base"
                  >
                    {brand.name.trim().charAt(0).toUpperCase()}
                  </span>
                )}
                {/* A div: the sidebar button truncates a last <span> child to one line. */}
                <div className="grid min-w-0 flex-1 leading-tight">
                  {/* Two lines, so a long name shows in full. Each space-separated part is
                      kept whole: browsers may otherwise break Lao mid-word. */}
                  <span className="line-clamp-2 text-sm font-semibold">
                    {brand.name.split(" ").map((part, i) => (
                      <Fragment key={i}>
                        {i > 0 ? " " : null}
                        <span className="whitespace-nowrap">{part}</span>
                      </Fragment>
                    ))}
                  </span>
                  <span className="truncate text-xs text-sidebar-foreground/65">
                    {brand.subtitle}
                  </span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {nav.map((group) => (
          <SidebarGroup key={group.key}>
            <SidebarGroupLabel className="text-sidebar-foreground/60">
              {group.label}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) =>
                  item.href && item.children ? (
                    <NavItemWithChildren
                      key={item.key}
                      item={{ ...item, href: item.href, children: item.children }}
                      pathname={pathname}
                      toggleLabel={labels.subMenu}
                      onNavigate={() => isMobile && setOpenMobile(false)}
                    />
                  ) : (
                    <SidebarMenuItem key={item.key}>
                      {item.href ? (
                        <SidebarMenuButton
                          asChild
                          isActive={isNavItemActive(item.href, pathname)}
                          tooltip={item.label}
                          className={activeClass}
                        >
                          <Link
                            href={item.href as Route}
                            aria-current={isNavItemActive(item.href, pathname) ? "page" : undefined}
                            onClick={() => isMobile && setOpenMobile(false)}
                          >
                            <NavIcon name={item.icon} />
                            <span>{item.label}</span>
                            {badgeFor(item.key) ? (
                              <span className="sr-only">
                                ({badgeFor(item.key)} {labels.unread})
                              </span>
                            ) : null}
                            <NavPending />
                          </Link>
                        </SidebarMenuButton>
                      ) : (
                        <SidebarMenuButton
                          aria-disabled="true"
                          tooltip={`${item.label}: ${labels.soonHint}`}
                          className="cursor-not-allowed text-sidebar-foreground/45 hover:bg-transparent hover:text-sidebar-foreground/45"
                        >
                          <NavIcon name={item.icon} />
                          <span>{item.label}</span>
                          <Badge
                            variant="outline"
                            className="ml-auto border-sidebar-border px-1.5 text-[10px] text-sidebar-foreground/55 group-data-[collapsible=icon]:hidden"
                          >
                            {labels.soon}
                          </Badge>
                        </SidebarMenuButton>
                      )}
                      {badgeFor(item.key) ? (
                        <SidebarMenuBadge
                          aria-hidden="true"
                          className="rounded-full bg-sidebar-primary px-1.5 text-sidebar-primary-foreground tabular-nums peer-hover/menu-button:text-sidebar-primary-foreground peer-data-[active=true]/menu-button:text-sidebar-primary-foreground"
                        >
                          {badgeFor(item.key)}
                        </SidebarMenuBadge>
                      ) : null}
                    </SidebarMenuItem>
                  ),
                )}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter className="h-1.5 bg-sidebar-primary p-0" aria-hidden="true" />
      <SidebarRail />
    </Sidebar>
  );
}
