import { config } from "dotenv";

/**
 * Environment files for the command-line tools (Prisma, seed, storage script):
 * the same files Next.js reads, with the same precedence. `.env.local` wins
 * over `.env`, and variables already set in the shell win over both.
 */
config({ path: [".env.local", ".env"], quiet: true });
