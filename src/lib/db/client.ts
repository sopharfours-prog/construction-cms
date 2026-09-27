import "server-only";

import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "@/generated/prisma/client";
import { getServerEnv } from "@/lib/env/server";

/**
 * One PrismaClient per server process. In development, Next.js hot reload
 * re-evaluates modules, so the instance is cached on globalThis to avoid
 * exhausting PostgreSQL connections.
 */
function createPrismaClient() {
  const { DATABASE_URL, NODE_ENV } = getServerEnv();
  const adapter = new PrismaPg({ connectionString: DATABASE_URL });

  return new PrismaClient({
    adapter,
    log: NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
}

const globalForPrisma = globalThis as unknown as { prisma?: ReturnType<typeof createPrismaClient> };

export const db = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}

export type Database = typeof db;
