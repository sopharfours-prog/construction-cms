import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../src/generated/prisma/client";

import { loadSeedEnv } from "./seed/env";
import {
  neutralSettings,
  seedAdmin,
  seedDemoUsers,
  seedLanguages,
  seedRoles,
  seedSettings,
  syncPermissions,
} from "./seed/foundation";
import { seedSampleData } from "./seed/sample";

/**
 * Idempotent seed: safe to run any number of times.
 *   npm run db:seed
 * Foundation data (languages, permissions, roles, admin, settings) is always
 * ensured. Sample content is controlled by SEED_SAMPLE_DATA.
 */
async function main() {
  const env = loadSeedEnv();
  const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: env.DATABASE_URL }) });

  try {
    console.log("Seeding foundation data…");
    await seedLanguages(db);
    await syncPermissions(db);
    await seedRoles(db);
    const admin = await seedAdmin(db, env);
    await seedDemoUsers(db, env);

    if (env.sampleData) {
      console.log("Seeding sample content (SEED_SAMPLE_DATA)…");
      await seedSampleData(db, admin.id);
    } else {
      await seedSettings(db, neutralSettings);
      console.log("  • sample content skipped");
    }
    console.log("Done.");
  } finally {
    await db.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
