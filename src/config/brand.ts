import type { BrandTokens } from "@/lib/theme/brand";

/**
 * Default brand colours. Website Settings (Phase 5+) stores overrides in the
 * database; these are the fallback when nothing is configured.
 */
export const defaultBrand: BrandTokens = {
  primary: "#14325a",
  primaryForeground: "#ffffff",
  accent: "#c99a2e",
  accentForeground: "#1f2328",
};
