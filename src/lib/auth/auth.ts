import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";

import { getRequestInfo } from "@/lib/security/request-info";
import { decodeToken } from "@/lib/auth/token-subject";
import { loginSchema } from "@/lib/validation/auth";
import { writeAuditLog } from "@/server/services/audit";
import { authenticateWithPassword } from "@/server/services/auth/login";

import { authConfig } from "./auth.config";

/** The `code` ends up in a URL, so it only says which generic message to show. */
class InvalidCredentials extends CredentialsSignin {
  override code = "invalid_credentials";
}
class RateLimited extends CredentialsSignin {
  override code = "rate_limited";
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: { email: {}, password: {}, remember: {} },
      async authorize(raw, request) {
        const parsed = loginSchema.safeParse({
          email: raw.email,
          password: raw.password,
          remember: raw.remember === "true" || raw.remember === "on",
        });
        if (!parsed.success) throw new InvalidCredentials();

        const result = await authenticateWithPassword(parsed.data, getRequestInfo(request.headers));
        if (!result.ok) {
          throw result.reason === "rate_limited" ? new RateLimited() : new InvalidCredentials();
        }
        return { ...result.user, remember: parsed.data.remember };
      },
    }),
  ],
  events: {
    async signOut(message) {
      const userId = "token" in message ? decodeToken(message.token) : null;
      if (userId)
        await writeAuditLog({ action: "LOGOUT", entity: "User", entityId: userId, userId });
    },
  },
});
