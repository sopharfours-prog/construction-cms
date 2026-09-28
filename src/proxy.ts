import NextAuth from "next-auth";
import { type NextFetchEvent, type NextRequest, NextResponse } from "next/server";

import { isLocale } from "@/config/i18n";
import { authConfig } from "@/lib/auth/auth.config";
import { SITE_LOCALE_COOKIE, localizedPath, pickLocale } from "@/i18n/routing";

const { auth } = NextAuth(authConfig);

const PUBLIC_ADMIN_PATHS = ["/admin/login", "/admin/forgot-password", "/admin/reset-password"];

/**
 * /admin: first line of defence, redirecting visitors without a valid,
 * unexpired session token to the login page. It does not touch the database;
 * the authoritative check (account status, session version, permissions) is
 * getCurrentUser() in the admin layout and in every server action.
 */
const adminProxy = auth((request) => {
  const { pathname, search } = request.nextUrl;
  const isPublic = PUBLIC_ADMIN_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  const isSignedIn = Boolean(request.auth?.user?.id);

  if (!isPublic && !isSignedIn) {
    const loginUrl = new URL("/admin/login", request.nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", `${pathname}${search}`);
    return NextResponse.redirect(loginUrl);
  }
  if (pathname === "/admin/login" && isSignedIn) {
    return NextResponse.redirect(new URL("/admin", request.nextUrl.origin));
  }

  const response = NextResponse.next();
  // The CMS is never indexed and never cached by shared caches.
  response.headers.set("X-Robots-Tag", "noindex, nofollow");
  response.headers.set("Cache-Control", "private, no-store");
  return response;
});

/**
 * Public site: every page lives under /lo or /en. A URL without a language
 * is sent to the visitor's language (saved choice, then browser setting,
 * then Lao). The redirect depends on the visitor, so it must not be cached
 * by shared caches; the localized pages themselves stay cacheable.
 */
function localeRedirect(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const first = pathname.split("/")[1] ?? "";
  if (isLocale(first)) return NextResponse.next();

  const locale = pickLocale(
    request.cookies.get(SITE_LOCALE_COOKIE)?.value,
    request.headers.get("accept-language"),
  );
  const target = new URL(`${localizedPath(locale, pathname)}${search}`, request.nextUrl.origin);
  const response = NextResponse.redirect(target, 307);
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("Vary", "Cookie, Accept-Language");
  return response;
}

export function proxy(request: NextRequest, event: NextFetchEvent) {
  const { pathname } = request.nextUrl;
  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    return (
      adminProxy as unknown as (
        req: NextRequest,
        ev: NextFetchEvent,
      ) => ReturnType<typeof NextResponse.next>
    )(request, event);
  }
  return localeRedirect(request);
}

export const config = {
  // Everything except API routes, Next internals, public media and files with an extension.
  matcher: ["/((?!api/|_next/|media/|.*\\.[a-zA-Z0-9]+$).*)"],
};
