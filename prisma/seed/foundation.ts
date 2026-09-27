import type { PrismaClient } from "../../src/generated/prisma/client";
import { hashPassword } from "../../src/lib/auth/password";
import { defaultRoles, SUPER_ADMIN_ROLE_KEY } from "../../src/lib/permissions/default-roles";
import { allPermissions } from "../../src/lib/permissions/registry";
import { settingsSchemas, type SettingsKey } from "../../src/lib/validation/settings";

import type { SeedEnv } from "./env";

export const languages = [
  { code: "lo", name: "Lao", nativeName: "ພາສາລາວ", isDefault: true, sortOrder: 0 },
  { code: "en", name: "English", nativeName: "English", isDefault: false, sortOrder: 1 },
] as const;

export async function seedLanguages(db: PrismaClient) {
  for (const language of languages) {
    // Create only: enabled/default flags are admin-managed afterwards.
    await db.language.upsert({ where: { code: language.code }, update: {}, create: language });
  }
  console.log(`  ✓ languages: ${languages.map((l) => l.code).join(", ")}`);
}

/**
 * Makes the permissions table match the code registry: adds new keys, updates
 * descriptions and removes keys that no longer exist in code.
 */
export async function syncPermissions(db: PrismaClient) {
  for (const p of allPermissions) {
    await db.permission.upsert({
      where: { key: p.key },
      update: { group: p.group, description: p.description },
      create: { key: p.key, group: p.group, description: p.description },
    });
  }
  const removed = await db.permission.deleteMany({
    where: { key: { notIn: allPermissions.map((p) => p.key) } },
  });
  console.log(
    `  ✓ permissions: ${allPermissions.length} synced, ${removed.count} obsolete removed`,
  );
}

export async function seedRoles(db: PrismaClient) {
  const permissionIds = new Map(
    (await db.permission.findMany({ select: { id: true, key: true } })).map((p) => [p.key, p.id]),
  );

  for (const def of defaultRoles) {
    const existing = await db.role.findUnique({ where: { key: def.key } });
    const role =
      existing ??
      (await db.role.create({
        data: { key: def.key, name: def.name, description: def.description, isSystem: true },
      }));

    const isSuperAdmin = def.key === SUPER_ADMIN_ROLE_KEY;
    // New roles get their defaults; existing roles keep admin edits,
    // except SUPER_ADMIN, which must always hold every permission.
    if (existing && !isSuperAdmin) continue;

    const keys = def.permissions === "all" ? [...permissionIds.keys()] : def.permissions;
    await db.rolePermission.createMany({
      data: keys.map((key) => {
        const permissionId = permissionIds.get(key);
        if (!permissionId) throw new Error(`Role ${def.key} references unknown permission ${key}`);
        return { roleId: role.id, permissionId };
      }),
      skipDuplicates: true,
    });
  }
  console.log(`  ✓ roles: ${defaultRoles.map((r) => r.key).join(", ")}`);
}

export async function seedAdmin(db: PrismaClient, env: SeedEnv) {
  const email = env.SEED_ADMIN_EMAIL;
  const existing = await db.user.findUnique({ where: { email } });

  if (existing) {
    console.log(`  • admin ${email} already exists (password left unchanged)`);
    return existing;
  }
  if (!env.SEED_ADMIN_PASSWORD) {
    throw new Error(
      "SEED_ADMIN_PASSWORD is required to create the first Super Administrator " +
        "(at least 12 characters). Set it in .env, run the seed, then remove it.",
    );
  }

  const role = await db.role.findUniqueOrThrow({ where: { key: SUPER_ADMIN_ROLE_KEY } });
  const admin = await db.user.create({
    data: {
      name: "Super Administrator",
      email,
      passwordHash: await hashPassword(env.SEED_ADMIN_PASSWORD),
      roleId: role.id,
      preferredLocale: "lo",
    },
  });
  await db.auditLog.create({
    data: {
      action: "CREATE",
      entity: "User",
      entityId: admin.id,
      newValue: { email, role: role.key, via: "seed" },
    },
  });
  console.log(`  ✓ admin ${email} created`);
  return admin;
}

/** Writes each settings group only if it is missing, after validating it. */
export async function seedSettings(db: PrismaClient, values: { [K in SettingsKey]: unknown }) {
  let created = 0;
  for (const key of Object.keys(settingsSchemas) as SettingsKey[]) {
    const value = settingsSchemas[key].parse(values[key]);
    const existing = await db.setting.findUnique({ where: { key } });
    if (existing) continue;
    await db.setting.create({ data: { key, value } });
    created++;
  }
  console.log(
    `  ✓ settings: ${created} created, ${Object.keys(settingsSchemas).length - created} kept`,
  );
}

export const neutralSettings = {
  general: {
    siteName: { lo: "ບໍລິສັດກໍ່ສ້າງ", en: "Construction Company" },
    description: { lo: "", en: "" },
    logoMediaId: null,
    faviconMediaId: null,
    foundedYear: null,
  },
  contact: {
    address: { lo: "", en: "" },
    phones: [],
    email: "info@example.com",
    openingHours: { lo: "", en: "" },
    mapEmbedUrl: null,
  },
  social: { facebook: null, instagram: null, tiktok: null, youtube: null, linkedin: null },
  seo: {
    defaultTitle: { lo: "ບໍລິສັດກໍ່ສ້າງ", en: "Construction Company" },
    defaultDescription: { lo: "", en: "" },
    ogImageMediaId: null,
    googleAnalyticsId: null,
    googleSiteVerification: null,
  },
  appearance: {
    brand: {
      primary: "#14325a",
      primaryForeground: "#ffffff",
      accent: "#c99a2e",
      accentForeground: "#1f2328",
    },
    defaultTheme: "light",
  },
  statistics: { yearsOfExperience: null, clients: null, teamMembers: null },
} satisfies { [K in SettingsKey]: unknown };

export async function seedDemoUsers(db: PrismaClient, env: SeedEnv) {
  if (!env.SEED_DEMO_USER_PASSWORD) {
    console.log("  • demo users skipped (SEED_DEMO_USER_PASSWORD not set)");
    return;
  }
  const demo = [
    { key: "ADMIN", name: "Khamla Sisouphanh", email: "administrator@example.com" },
    { key: "CONTENT_EDITOR", name: "Noy Keomany", email: "editor@example.com" },
    { key: "PROJECT_EDITOR", name: "Bounmy Phanthavong", email: "projects@example.com" },
    { key: "VIEWER", name: "Vanh Inthavong", email: "viewer@example.com" },
  ];
  const passwordHash = await hashPassword(env.SEED_DEMO_USER_PASSWORD);
  for (const user of demo) {
    const role = await db.role.findUniqueOrThrow({ where: { key: user.key } });
    await db.user.upsert({
      where: { email: user.email },
      update: {},
      create: { name: user.name, email: user.email, passwordHash, roleId: role.id },
    });
  }
  console.log(`  ✓ demo users: ${demo.map((u) => u.email).join(", ")}`);
}
