import { z } from "zod";

import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from "../../src/lib/auth/password";

const booleanFlag = z
  .enum(["true", "false", "1", "0", ""])
  .optional()
  .transform((value) =>
    value === undefined || value === "" ? undefined : value === "true" || value === "1",
  );

const password = z
  .string()
  .min(PASSWORD_MIN_LENGTH, `must be at least ${PASSWORD_MIN_LENGTH} characters`)
  .max(PASSWORD_MAX_LENGTH);

const seedEnvSchema = z.object({
  NODE_ENV: z.string().optional(),
  DATABASE_URL: z.string().min(1, "is required"),
  SEED_ADMIN_EMAIL: z
    .email()
    .default("admin@example.com")
    .transform((e) => e.toLowerCase()),
  /** Required only when the admin account does not exist yet. */
  SEED_ADMIN_PASSWORD: password.optional().or(z.literal("").transform(() => undefined)),
  /** Sample projects, services, news… Defaults to on, except in production. */
  SEED_SAMPLE_DATA: booleanFlag,
  /** When set, creates one demo account per non-super role with this password. */
  SEED_DEMO_USER_PASSWORD: password.optional().or(z.literal("").transform(() => undefined)),
});

export type SeedEnv = z.infer<typeof seedEnvSchema> & { sampleData: boolean };

export function loadSeedEnv(): SeedEnv {
  const result = seedEnvSchema.safeParse(process.env);
  if (!result.success) {
    // Names and rules only; never echo values, which may be passwords.
    const problems = result.error.issues
      .map((i) => `  • ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(`Seed environment is invalid:\n${problems}`);
  }
  const env = result.data;
  return { ...env, sampleData: env.SEED_SAMPLE_DATA ?? env.NODE_ENV !== "production" };
}
