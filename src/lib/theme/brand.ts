import { z } from "zod";

const hexColor = z
  .string()
  .trim()
  .regex(/^#[0-9a-fA-F]{6}$/, "Colour must be a 6-digit hex value such as #14325a")
  .transform((value) => value.toLowerCase());

export const brandTokensSchema = z.object({
  primary: hexColor,
  primaryForeground: hexColor,
  accent: hexColor,
  accentForeground: hexColor,
});

export type BrandTokens = z.infer<typeof brandTokensSchema>;

const cssVariableMap: Record<keyof BrandTokens, string> = {
  primary: "--brand-primary",
  primaryForeground: "--brand-primary-foreground",
  accent: "--brand-accent",
  accentForeground: "--brand-accent-foreground",
};

/**
 * Build the :root rule that applies brand colours.
 *
 * Values come from an admin-editable setting and end up inside a <style>
 * tag, so they are re-validated here: anything that is not a strict hex
 * colour falls back to the default instead of reaching the page (prevents
 * CSS injection such as `red;}</style><script>`).
 */
export function buildBrandCss(input: unknown, fallback: BrandTokens): string {
  const parsed = brandTokensSchema.safeParse(input);
  const tokens = parsed.success ? parsed.data : fallback;

  const declarations = (Object.keys(cssVariableMap) as (keyof BrandTokens)[])
    .map((key) => `${cssVariableMap[key]}:${tokens[key]}`)
    .join(";");

  return `:root{${declarations}}`;
}
