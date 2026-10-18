import { defineConfig, mergeConfig } from "vitest/config";

import base from "./vitest.config";

/**
 * Integration tests run against a real PostgreSQL database (DATABASE_URL from
 * .env.local or .env). Point them at a disposable database: they create and delete users.
 *   npm run test:integration
 */
export default mergeConfig(
  base,
  defineConfig({
    test: {
      include: ["tests/integration/**/*.test.ts"],
      // .env.local, then .env: the same files and precedence as Next.js.
      setupFiles: ["./scripts/load-env.ts"],
      fileParallelism: false,
      testTimeout: 30_000,
    },
  }),
);
