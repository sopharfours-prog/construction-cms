import { allPermissions, type PermissionKey } from "./registry";

/**
 * Initial role → permission assignments, used by the seed only.
 *
 * At runtime, authorization reads role_permissions from the database, so a
 * Super Administrator can change these assignments in the CMS without a
 * deploy. Re-running the seed never overwrites those changes, except that
 * SUPER_ADMIN is always re-granted every permission.
 */
export type DefaultRole = {
  key: string;
  name: string;
  description: string;
  permissions: readonly PermissionKey[] | "all";
};

const viewPermissions = allPermissions
  .map((p) => p.key)
  .filter((key) => key.endsWith(".view") && key !== "audit.view");

export const SUPER_ADMIN_ROLE_KEY = "SUPER_ADMIN";

export const defaultRoles: readonly DefaultRole[] = [
  {
    key: SUPER_ADMIN_ROLE_KEY,
    name: "Super Administrator",
    description: "Full access, including users, roles, settings and audit logs.",
    permissions: "all",
  },
  {
    key: "ADMIN",
    name: "Administrator",
    description: "Manages all website content, media and customer communication.",
    permissions: [
      "dashboard.view",
      "projects.view",
      "projects.create",
      "projects.update",
      "projects.delete",
      "projects.publish",
      "services.view",
      "services.create",
      "services.update",
      "services.delete",
      "services.publish",
      "news.view",
      "news.create",
      "news.update",
      "news.delete",
      "news.publish",
      "pages.view",
      "pages.create",
      "pages.update",
      "pages.delete",
      "pages.publish",
      "taxonomy.manage",
      "media.view",
      "media.upload",
      "media.update",
      "media.delete",
      "inquiries.view",
      "inquiries.update",
      "inquiries.delete",
      "quotes.view",
      "quotes.update",
      "quotes.delete",
      "chats.view",
      "chats.reply",
      "chats.delete",
      "settings.view",
    ],
  },
  {
    key: "CONTENT_EDITOR",
    name: "Content Editor",
    description: "Writes news and pages and manages the media library.",
    permissions: [
      "dashboard.view",
      "news.view",
      "news.create",
      "news.update",
      "news.publish",
      "pages.view",
      "pages.create",
      "pages.update",
      "pages.publish",
      "taxonomy.manage",
      "media.view",
      "media.upload",
      "media.update",
      "media.delete",
    ],
  },
  {
    key: "PROJECT_EDITOR",
    name: "Project Editor",
    description: "Creates and edits projects and their photo galleries.",
    permissions: [
      "dashboard.view",
      "projects.view",
      "projects.create",
      "projects.update",
      "projects.publish",
      "services.view",
      "media.view",
      "media.upload",
      "media.update",
    ],
  },
  {
    key: "VIEWER",
    name: "Viewer",
    description: "Read-only access to the CMS. Cannot change anything.",
    permissions: viewPermissions,
  },
];
