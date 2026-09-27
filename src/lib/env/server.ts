import "server-only";

import { z } from "zod";

/**
 * Server-only environment variables.
 *
 * Each phase adds the variables it actually uses (DATABASE_URL in Phase 2,
 * AUTH_SECRET in Phase 3, S3_* in Phase 6). Keeping the schema honest means
 * the app never demands a secret it does not read yet.
 *
 * Importing this file from a Client Component fails the build (server-only).
 */
const serverEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z
    .string()
    .min(1, "DATABASE_URL is required")
    .refine((url) => /^postgres(ql)?:\/\//.test(url), "Expected a postgresql:// connection URL"),
  AUTH_SECRET: z
    .string({ error: "AUTH_SECRET is required (generate with: npx auth secret)" })
    .min(32, "AUTH_SECRET must be at least 32 characters"),
  SMTP_HOST: z
    .string()
    .optional()
    .transform((v) => v || undefined),
  SMTP_PORT: z.coerce.number().int().min(1).max(65535).default(587),
  SMTP_SECURE: z
    .enum(["true", "false", ""])
    .optional()
    .transform((v) => v === "true"),
  SMTP_USER: z
    .string()
    .optional()
    .transform((v) => v || undefined),
  SMTP_PASSWORD: z
    .string()
    .optional()
    .transform((v) => v || undefined),
  SMTP_FROM: z.string().default("Construction CMS <no-reply@example.com>"),
  GOOGLE_ANALYTICS_ID: z
    .string()
    .regex(/^G-[A-Z0-9]+$/, "Expected a GA4 measurement ID such as G-XXXXXXX")
    .optional()
    .or(z.literal("").transform(() => undefined)),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

let cached: ServerEnv | undefined;

/** Validated server environment. Parsed once, on first use. */
export function getServerEnv(): ServerEnv {
  if (cached) return cached;

  const result = serverEnvSchema.safeParse(process.env);
  if (!result.success) {
    // Report variable names only; never echo values, which may be secrets.
    const fields = result.error.issues.map((issue) => issue.path.join(".")).join(", ");
    throw new Error(
      `Invalid server environment variables: ${fields}. See .env.example for the expected format.`,
    );
  }

  cached = result.data;
  return cached;
}
