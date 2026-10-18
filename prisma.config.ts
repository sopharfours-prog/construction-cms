import { config } from "dotenv";

import { defineConfig } from "prisma/config";

/**
 * Prisma 7 reads connection details from here, not from schema.prisma.
 * It loads .env.local and .env, the files Next.js reads, so one
 * file serves both.
 *
 * DATABASE_URL is read optionally on purpose: `prisma generate` runs on
 * `npm install` (postinstall) and in Docker build stages, before any .env or
 * database exists, and it needs no connection. Commands that do connect
 * (migrate, db seed, studio) fail with "Connection url is empty" if unset.
 */
// Inline (not imported from scripts/load-env): the Docker dependency stage
// copies only this file and prisma/ before `npm ci` runs `prisma generate`.
config({ path: [".env.local", ".env"], quiet: true });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: process.env.DATABASE_URL,
  },
});
