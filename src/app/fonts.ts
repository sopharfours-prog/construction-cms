import localFont from "next/font/local";

/**
 * Self-hosted variable fonts (SIL OFL, licences in src/assets/fonts).
 * Bundled rather than fetched from Google so builds work offline,
 * inside Docker and on private servers.
 */
export const archivo = localFont({
  src: "../assets/fonts/archivo-latin-standard-normal.woff2",
  variable: "--font-archivo",
  weight: "100 900",
  style: "normal",
  display: "swap",
  declarations: [{ prop: "font-stretch", value: "62% 125%" }],
});

export const notoSansLao = localFont({
  src: "../assets/fonts/noto-sans-lao-lao-wght-normal.woff2",
  variable: "--font-lao",
  weight: "100 900",
  style: "normal",
  display: "swap",
  declarations: [{ prop: "unicode-range", value: "U+0E81-0EDF, U+200C-200D, U+25CC" }],
});
