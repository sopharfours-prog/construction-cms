import "server-only";

import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "@/generated/prisma/client";
import { getServerEnv } from "@/lib/env/server";

function createPrismaClient() {
  const { DATABASE_URL, NODE_ENV } = getServerEnv();
  return new PrismaClient({
    adapter: new PrismaPg({ connectionString: DATABASE_URL }),
    log: NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
}

type Client = ReturnType<typeof createPrismaClient>;

// One client per process. Cached on globalThis because Next.js dev hot reload
// re-evaluates modules and would otherwise exhaust PostgreSQL connections.
const globalForPrisma = globalThis as unknown as { prisma?: Client };

function getClient(): Client {
  globalForPrisma.prisma ??= createPrismaClient();
  return globalForPrisma.prisma;
}

/**
 * The database client, created lazily on first use.
 *
 * Creating it at import time would validate DATABASE_URL and AUTH_SECRET
 * during `next build`, which must work without production secrets (Docker
 * build stages, CI). Environment errors surface on the first query instead.
 */
export const db: Client = new Proxy({} as Client, {
  get(_target, property) {
    const client = getClient();
    const value: unknown = Reflect.get(client, property, client);
    return typeof value === "function" ? value.bind(client) : value;
  },
});

export type Database = Client;
