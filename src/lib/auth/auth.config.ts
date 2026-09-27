import type { NextAuthConfig } from "next-auth";

export const SESSION_MAX_AGE_REMEMBER = 30 * 24 * 60 * 60; // seconds
export const SESSION_MAX_AGE_DEFAULT = 12 * 60 * 60;

/**
 * Database-free Auth.js settings, shared by proxy.ts and the full config.
 *
 * The JWT holds only the user id, session version and expiry. Permissions are
 * never put in the token: getCurrentUser() reads them from the database on
 * each request, so role changes and account disabling take effect at once.
 */
export const authConfig = {
  pages: { signIn: "/admin/login", error: "/admin/login" },
  session: { strategy: "jwt", maxAge: SESSION_MAX_AGE_REMEMBER },
  providers: [],
  callbacks: {
    jwt({ token, user }) {
      if (user?.id) {
        const maxAge = user.remember ? SESSION_MAX_AGE_REMEMBER : SESSION_MAX_AGE_DEFAULT;
        token.uid = user.id;
        token.sv = user.sessionVersion ?? 0;
        token.exp_at = Date.now() + maxAge * 1000;
      }
      // Without "remember me" the cookie still lives 30 days, but the
      // session inside it ends after 12 hours.
      if (!token.uid || !token.exp_at || Date.now() > token.exp_at) return null;
      return token;
    },
    session({ session, token }) {
      session.user.id = token.uid ?? "";
      session.sessionVersion = token.sv ?? 0;
      return session;
    },
  },
} satisfies NextAuthConfig;
