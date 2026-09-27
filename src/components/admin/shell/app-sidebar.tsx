"use client";

import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";

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
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";
import { isNavItemActive, type VisibleNavGroup } from "@/lib/admin/nav";

import { NavIcon } from "./nav-icon";

type AppSidebarProps = {
  nav: VisibleNavGroup[];
  companyName: string;
  cmsName: string;
  labels: { soon: string; soonHint: string; mainNavigation: string };
};

export function AppSidebar({ nav, companyName, cmsName, labels }: AppSidebarProps) {
  const pathname = usePathname();
  const { isMobile, setOpenMobile } = useSidebar();

  return (
    <Sidebar collapsible="icon" aria-label={labels.mainNavigation}>
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-3 px-1 py-1.5">
          <span
            aria-hidden="true"
            className="flex size-8 shrink-0 items-center justify-center rounded-sm bg-sidebar-primary text-base type-heading text-sidebar-primary-foreground"
          >
            {companyName.trim().charAt(0).toUpperCase()}
          </span>
          <div className="min-w-0 group-data-[collapsible=icon]:hidden">
            <p className="truncate text-sm font-semibold">{companyName}</p>
            <p className="truncate text-xs text-sidebar-foreground/65">{cmsName}</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        {nav.map((group) => (
          <SidebarGroup key={group.key}>
            <SidebarGroupLabel className="text-sidebar-foreground/60">
              {group.label}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.key}>
                    {item.href ? (
                      <SidebarMenuButton
                        asChild
                        isActive={isNavItemActive(item.href, pathname)}
                        tooltip={item.label}
                        className="data-[active=true]:bg-sidebar-accent data-[active=true]:shadow-[inset_3px_0_0_var(--sidebar-primary)]"
                      >
                        <Link
                          href={item.href as Route}
                          aria-current={isNavItemActive(item.href, pathname) ? "page" : undefined}
                          onClick={() => isMobile && setOpenMobile(false)}
                        >
                          <NavIcon name={item.icon} />
                          <span>{item.label}</span>
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
                  </SidebarMenuItem>
                ))}
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
