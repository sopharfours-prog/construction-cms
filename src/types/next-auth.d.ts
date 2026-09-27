import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface User {
    sessionVersion?: number;
    remember?: boolean;
  }
  interface Session {
    sessionVersion: number;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    uid?: string;
    sv?: number;
    /** Absolute session expiry (ms since epoch), enforced on every request. */
    exp_at?: number;
  }
}
