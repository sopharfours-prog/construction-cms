/**
 * Content-Security-Policy builders.
 *
 * The CMS renders per request, so it gets a nonce and 'strict-dynamic': only
 * scripts Next.js marks with this request's nonce run. Public pages are
 * cached (ISR) and a per-request nonce would make them dynamic, so they allow
 * inline scripts (Next's data payload) but everything else is locked down.
 */
type CspOptions = {
  /** Origin serving public files (S3/R2/CDN), when not the site itself. */
  storageOrigin?: string | null;
  isDev?: boolean;
};

const GA = ["https://www.googletagmanager.com"];
const GA_CONNECT = [
  "https://*.google-analytics.com",
  "https://*.analytics.google.com",
  "https://www.googletagmanager.com",
];

function serialize(directives: Record<string, string[]>): string {
  return Object.entries(directives)
    .map(([name, values]) => (values.length ? `${name} ${values.join(" ")}` : name))
    .join("; ");
}

function common({ storageOrigin, isDev }: CspOptions): Record<string, string[]> {
  const storage = storageOrigin ? [storageOrigin] : [];
  return {
    "default-src": ["'self'"],
    "base-uri": ["'self'"],
    "object-src": ["'none'"],
    "frame-ancestors": ["'none'"],
    "form-action": ["'self'"],
    "img-src": ["'self'", "data:", "blob:", ...storage],
    "media-src": ["'self'", "blob:", ...storage],
    "font-src": ["'self'"],
    // Inline styles are used by React components (Radix positioning, brand variables).
    "style-src": ["'self'", "'unsafe-inline'"],
    ...(isDev ? {} : { "upgrade-insecure-requests": [] }),
  };
}

export function publicSiteCsp(options: CspOptions): string {
  const base = common(options);
  return serialize({
    ...base,
    "script-src": ["'self'", "'unsafe-inline'", ...GA, ...(options.isDev ? ["'unsafe-eval'"] : [])],
    "img-src": [...base["img-src"]!, ...GA, ...GA_CONNECT.slice(0, 1)],
    "connect-src": ["'self'", ...GA_CONNECT, ...(options.isDev ? ["ws:"] : [])],
    // Google Maps embed on the contact page.
    "frame-src": ["https://www.google.com"],
  });
}

export function adminCsp(nonce: string, options: CspOptions): string {
  return serialize({
    ...common(options),
    "script-src": [
      "'self'",
      `'nonce-${nonce}'`,
      "'strict-dynamic'",
      ...(options.isDev ? ["'unsafe-eval'"] : []),
    ],
    "connect-src": ["'self'", ...(options.isDev ? ["ws:"] : [])],
    "frame-src": ["'none'"],
  });
}

/** JSON APIs and file responses never need to run or embed anything. */
export const apiCsp = "default-src 'none'; frame-ancestors 'none'; base-uri 'none'";

export function storageOriginFromEnv(env: Record<string, string | undefined>): string | null {
  if (env.STORAGE_DRIVER !== "s3" || !env.S3_PUBLIC_URL) return null;
  try {
    return new URL(env.S3_PUBLIC_URL).origin;
  } catch {
    return null;
  }
}

/** 128-bit random nonce, base64 (works in the Node and Edge runtimes). */
export function createNonce(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return btoa(String.fromCharCode(...bytes));
}
