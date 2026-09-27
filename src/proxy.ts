import NextAuth from "next-auth";
import { NextResponse } from "next/server";

import { authConfig } from "@/lib/auth/auth.config";

/**
 * First line of defence for /admin: redirects visitors without a valid,
 * unexpired session token to the login page. It does not touch the database;
 * the authoritative check (account status, session version, permissions) is
 * getCurrentUser() in the admin layout and in every server action.
 */
const { auth } = NextAuth(authConfig);

const PUBLIC_ADMIN_PATHS = ["/admin/login", "/admin/forgot-password", "/admin/reset-password"];

export const proxy = auth((request) => {
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

export const config = {
  matcher: ["/admin", "/admin/:path*"],
};
