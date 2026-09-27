/**
 * Permission registry: the complete list of permission keys the code can check.
 *
 * Which ROLE holds which permission is data (role_permissions table), editable
 * by a Super Administrator. This file only defines what permissions exist, so
 * a typo in a check such as can("projcts.update") fails type-checking.
 *
 * Adding a permission: add it here, run `npm run db:seed` (syncs the table and
 * grants it to SUPER_ADMIN), then assign it to other roles in the CMS.
 */
export const permissionRegistry = {
  dashboard: {
    "dashboard.view": "View the admin dashboard",
  },
  projects: {
    "projects.view": "View projects in the CMS",
    "projects.create": "Create projects",
    "projects.update": "Edit projects and their galleries",
    "projects.delete": "Delete projects",
    "projects.publish": "Publish and unpublish projects",
  },
  services: {
    "services.view": "View services in the CMS",
    "services.create": "Create services",
    "services.update": "Edit and reorder services",
    "services.delete": "Delete services",
    "services.publish": "Publish and unpublish services",
  },
  news: {
    "news.view": "View news in the CMS",
    "news.create": "Create news articles",
    "news.update": "Edit news articles",
    "news.delete": "Delete news articles",
    "news.publish": "Publish, schedule and archive news",
  },
  pages: {
    "pages.view": "View pages and About-page content",
    "pages.create": "Create pages",
    "pages.update": "Edit pages, team, certifications and timeline",
    "pages.delete": "Delete pages",
    "pages.publish": "Publish and unpublish pages",
  },
  taxonomy: {
    "taxonomy.manage": "Create, edit and delete categories and tags",
  },
  media: {
    "media.view": "Browse the media library",
    "media.upload": "Upload and replace files",
    "media.update": "Edit file details and folders",
    "media.delete": "Delete files",
  },
  inquiries: {
    "inquiries.view": "Read contact-form inquiries",
    "inquiries.update": "Change status, assign, add notes and reply",
    "inquiries.delete": "Archive and delete inquiries",
  },
  quotes: {
    "quotes.view": "Read quote requests and download attachments",
    "quotes.update": "Change status, assign, add notes and contact customers",
    "quotes.delete": "Archive and delete quote requests",
  },
  users: {
    "users.view": "View staff accounts",
    "users.create": "Create staff accounts",
    "users.update": "Edit accounts, disable, reset passwords and assign roles",
    "users.delete": "Delete staff accounts",
  },
  roles: {
    "roles.manage": "Change which permissions each role has",
  },
  settings: {
    "settings.view": "View website settings",
    "settings.update": "Change website settings",
  },
  audit: {
    "audit.view": "View audit logs",
  },
} as const;

type Registry = typeof permissionRegistry;
export type PermissionGroup = keyof Registry;
export type PermissionKey = { [G in PermissionGroup]: keyof Registry[G] }[PermissionGroup] & string;

export type PermissionDefinition = {
  key: PermissionKey;
  group: PermissionGroup;
  description: string;
};

/** Flat list of every permission, in registry order. */
export const allPermissions: readonly PermissionDefinition[] = Object.entries(
  permissionRegistry,
).flatMap(([group, entries]) =>
  Object.entries(entries).map(([key, description]) => ({
    key: key as PermissionKey,
    group: group as PermissionGroup,
    description,
  })),
);

const permissionKeySet: ReadonlySet<string> = new Set(allPermissions.map((p) => p.key));

export function isPermissionKey(value: string): value is PermissionKey {
  return permissionKeySet.has(value);
}
