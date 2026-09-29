import type { NextConfig } from "next";
import type { RemotePattern } from "next/dist/shared/lib/image-config";

import { apiCsp } from "./src/lib/security/csp";

const isProduction = process.env.NODE_ENV === "production";

/**
 * Baseline security headers for every response.
 * The Content-Security-Policy is added in Phase 11 (Security) through proxy.ts,
 * because a strict CSP needs a per-request nonce.
 */
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()",
  },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  ...(isProduction
    ? [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" }]
    : []),
];

/** Only the public storage URL (S3 / R2 / CDN / MinIO) may serve images to next/image. */
function storageImagePatterns(): RemotePattern[] {
  const base = process.env.S3_PUBLIC_URL;
  if (process.env.STORAGE_DRIVER !== "s3" || !base) return [];
  const url = new URL(base);
  return [
    {
      protocol: url.protocol.replace(":", "") as "http" | "https",
      hostname: url.hostname,
      port: url.port,
      pathname: `${url.pathname.replace(/\/+$/, "")}/public/**`,
    },
  ];
}

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  typedRoutes: true,
  experimental: {
    // The site and the CMS are separate root layouts, so unmatched URLs need a
    // global 404 (Next.js docs: global-not-found). Re-check when upgrading Next.js.
    globalNotFound: true,
  },
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: storageImagePatterns(),
    // MinIO on a private network address needs this; off unless explicitly enabled
    // because it lets the image optimizer fetch from internal hosts.
    dangerouslyAllowLocalIP: process.env.IMAGES_ALLOW_LOCAL_IP === "true",
  },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      // JSON APIs and served files never run scripts or get framed. Pages get
      // their CSP from src/proxy.ts (nonce for the CMS).
      { source: "/api/:path*", headers: [{ key: "Content-Security-Policy", value: apiCsp }] },
      { source: "/media/:path*", headers: [{ key: "Content-Security-Policy", value: apiCsp }] },
    ];
  },
};

export default nextConfig;
