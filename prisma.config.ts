import "dotenv/config";

import { defineConfig, env } from "prisma/config";

/**
 * Prisma 7 reads connection details from here, not from schema.prisma.
 * dotenv loads .env; for local development put DATABASE_URL in .env
 * (Next.js also reads .env, so one file serves both).
 */
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
