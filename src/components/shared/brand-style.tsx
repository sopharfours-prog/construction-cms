import { defaultBrand } from "@/config/brand";
import { buildBrandCss } from "@/lib/theme/brand";

/**
 * Injects validated brand colour variables. `tokens` will come from
 * Website Settings once the database exists; invalid input falls back
 * to the default brand.
 */
export function BrandStyle({ tokens = defaultBrand }: { tokens?: unknown }) {
  return <style id="brand-tokens">{buildBrandCss(tokens, defaultBrand)}</style>;
}
