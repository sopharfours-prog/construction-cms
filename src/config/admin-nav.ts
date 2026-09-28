import type { PermissionKey } from "@/lib/permissions/registry";

/**
 * Admin navigation. Plain data (icon *names*, not components) so the server
 * can filter it by permission and pass the result to the client sidebar.
 *
 * `ready: false` sections are listed but not linked until their phase ships,
 * so there are never links to routes that don't exist.
 */
export type AdminNavIcon =
  | "layout-dashboard"
  | "hard-hat"
  | "wrench"
  | "newspaper"
  | "images"
  | "file-text"
  | "inbox"
  | "file-spreadsheet"
  | "users"
  | "scroll-text"
  | "settings"
  | "tags";

export type AdminNavItemKey =
  | "dashboard"
  | "projects"
  | "services"
  | "news"
  | "media"
  | "pages"
  | "taxonomy"
  | "inquiries"
  | "quotes"
  | "users"
  | "auditLogs"
  | "settings";

export type AdminNavGroupKey = "overview" | "content" | "customers" | "system";

export type AdminNavItemDef = {
  key: AdminNavItemKey;
  href: string;
  icon: AdminNavIcon;
  /** Shown only to users holding this permission. */
  permission: PermissionKey;
  ready: boolean;
};

export const adminNav: readonly { key: AdminNavGroupKey; items: readonly AdminNavItemDef[] }[] = [
  {
    key: "overview",
    items: [
      {
        key: "dashboard",
        href: "/admin",
        icon: "layout-dashboard",
        permission: "dashboard.view",
        ready: true,
      },
    ],
  },
  {
    key: "content",
    items: [
      {
        key: "projects",
        href: "/admin/projects",
        icon: "hard-hat",
        permission: "projects.view",
        ready: true,
      },
      {
        key: "services",
        href: "/admin/services",
        icon: "wrench",
        permission: "services.view",
        ready: true,
      },
      {
        key: "news",
        href: "/admin/news",
        icon: "newspaper",
        permission: "news.view",
        ready: true,
      },
      {
        key: "pages",
        href: "/admin/pages",
        icon: "file-text",
        permission: "pages.view",
        ready: true,
      },
      {
        key: "taxonomy",
        href: "/admin/taxonomy",
        icon: "tags",
        permission: "taxonomy.manage",
        ready: true,
      },
      {
        key: "media",
        href: "/admin/media",
        icon: "images",
        permission: "media.view",
        ready: true,
      },
    ],
  },
  {
    key: "customers",
    items: [
      {
        key: "inquiries",
        href: "/admin/inquiries",
        icon: "inbox",
        permission: "inquiries.view",
        ready: true,
      },
      {
        key: "quotes",
        href: "/admin/quotes",
        icon: "file-spreadsheet",
        permission: "quotes.view",
        ready: true,
      },
    ],
  },
  {
    key: "system",
    items: [
      { key: "users", href: "/admin/users", icon: "users", permission: "users.view", ready: false },
      {
        key: "auditLogs",
        href: "/admin/audit-logs",
        icon: "scroll-text",
        permission: "audit.view",
        ready: true,
      },
      {
        key: "settings",
        href: "/admin/settings",
        icon: "settings",
        permission: "settings.view",
        ready: false,
      },
    ],
  },
];
