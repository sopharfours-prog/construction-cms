import { z } from "zod";

/**
 * Public (browser-exposed) environment variables.
 * Only NEXT_PUBLIC_* values may live here. Anything secret belongs in ./server.ts.
 */
const publicEnvSchema = z.object({
  NEXT_PUBLIC_SITE_URL: z.url({ protocol: /^https?$/ }).transform((url) => url.replace(/\/+$/, "")),
});

export type PublicEnv = z.infer<typeof publicEnvSchema>;

function loadPublicEnv(): PublicEnv {
  const isProduction = process.env.NODE_ENV === "production";

  const result = publicEnvSchema.safeParse({
    // Next.js inlines NEXT_PUBLIC_* at build time only when referenced literally.
    NEXT_PUBLIC_SITE_URL:
      process.env.NEXT_PUBLIC_SITE_URL || (isProduction ? undefined : "http://localhost:3000"),
  });

  if (!result.success) {
    const fields = result.error.issues.map((issue) => issue.path.join(".")).join(", ");
    throw new Error(
      `Invalid public environment variables: ${fields}. See .env.example for the expected format.`,
    );
  }

  return result.data;
}

export const publicEnv = loadPublicEnv();
