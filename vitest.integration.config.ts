import { defineConfig, mergeConfig } from "vitest/config";

import base from "./vitest.config";

/**
 * Integration tests run against a real PostgreSQL database (DATABASE_URL from
 * .env). Point them at a disposable database: they create and delete users.
 *   npm run test:integration
 */
export default mergeConfig(
  base,
  defineConfig({
    test: {
      include: ["tests/integration/**/*.test.ts"],
      setupFiles: ["dotenv/config"],
      fileParallelism: false,
      testTimeout: 30_000,
    },
  }),
);
