import type { Route } from "next";

const DEFAULT_ADMIN_PATH = "/admin" as Route;

/**
 * Accept only same-site admin paths as a post-login destination.
 * Rejects absolute URLs, protocol-relative URLs (//evil.com), backslash
 * tricks (/\evil.com), and anything outside /admin, preventing open redirects.
 */
export function safeAdminCallbackUrl(value: unknown): Route {
  if (typeof value !== "string" || value.length === 0 || value.length > 2048) {
    return DEFAULT_ADMIN_PATH;
  }
  if (!value.startsWith("/") || value.startsWith("//") || value.includes("\\")) {
    return DEFAULT_ADMIN_PATH;
  }
  // Control characters can be normalised away by browsers into "//".
  if (/[\u0000-\u001f\u007f]/.test(value)) return DEFAULT_ADMIN_PATH;

  let url: URL;
  try {
    url = new URL(value, "http://localhost");
  } catch {
    return DEFAULT_ADMIN_PATH;
  }
  if (url.origin !== "http://localhost") return DEFAULT_ADMIN_PATH;

  const path = url.pathname;
  const isAdmin = path === DEFAULT_ADMIN_PATH || path.startsWith(`${DEFAULT_ADMIN_PATH}/`);
  const isAuthPage = /^\/admin\/(login|forgot-password|reset-password)(\/|$)/.test(path);
  if (!isAdmin || isAuthPage) return DEFAULT_ADMIN_PATH;

  // Validated above: a same-origin path under /admin.
  return `${path}${url.search}` as Route;
}
