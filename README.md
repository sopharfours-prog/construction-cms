# Construction CMS

Corporate website and content management system for a construction company.
Public site in Lao and English, with a role-based admin CMS for projects,
services, news, media, inquiries and quote requests.

> **Status: Phase 3 of 14 (authentication).** The CMS screens and public pages
> are built in later phases. See [Roadmap](#roadmap).

## Stack

| Layer      | Choice                                                          |
| ---------- | --------------------------------------------------------------- |
| Framework  | Next.js 16 (App Router, Turbopack), React 19, TypeScript strict |
| Styling    | Tailwind CSS v4, shadcn/ui (Radix), Lucide icons                |
| Validation | Zod                                                             |
| Database   | PostgreSQL + Prisma 7 (driver adapter `pg`)                     |
| Auth       | Auth.js with RBAC (Phase 3)                                     |
| Storage    | S3-compatible adapter: AWS S3, Cloudflare R2, MinIO (Phase 6)   |

## Requirements

- Node.js 20.9 or newer (22 LTS recommended, see `.nvmrc`)
- npm 10+
- PostgreSQL 15+ (or Docker, using the included `docker-compose.yml`)

## Getting started

```bash
npm install                  # also generates the Prisma client
cp .env.example .env         # set DATABASE_URL and SEED_ADMIN_PASSWORD
docker compose up -d         # local PostgreSQL (skip if you have your own)
npm run db:deploy            # apply migrations
npm run db:seed              # roles, admin account, sample content
npm run dev                  # http://localhost:3000
```

Check the app can reach the database at
[http://localhost:3000/api/health](http://localhost:3000/api/health).

Database details, conventions and the migration workflow are in
[DATABASE.md](DATABASE.md).

In development, the design system reference is at
[http://localhost:3000/styleguide](http://localhost:3000/styleguide). It returns 404 in production.

## Scripts

| Command                    | What it does                                        |
| -------------------------- | --------------------------------------------------- |
| `npm run dev`              | Development server                                  |
| `npm run build`            | Production build                                    |
| `npm run start`            | Serve the production build                          |
| `npm run typecheck`        | Generate route types, then run `tsc --noEmit`       |
| `npm run lint`             | ESLint, failing on any warning                      |
| `npm run lint:fix`         | ESLint with autofix                                 |
| `npm run format`           | Format everything with Prettier                     |
| `npm run format:check`     | Verify formatting without writing                   |
| `npm run check`            | typecheck + lint + format:check (run before commit) |
| `npm run db:*`             | Database scripts, see [DATABASE.md](DATABASE.md)    |
| `npm test`                 | Unit tests (Vitest)                                 |
| `npm run test:integration` | Integration tests against PostgreSQL                |

## Environment variables

All variables are documented in [`.env.example`](.env.example), grouped by the
phase that starts using them. `.env` and `.env.*` are git-ignored; only the
template is committed.

`NEXT_PUBLIC_SITE_URL` is required for production builds. The build fails
with a message naming the missing variable rather than shipping wrong
canonical URLs.

## Project structure

```text
src/
├── app/                  Routes (App Router)
│   ├── (dev)/styleguide  Design system reference, development only
│   ├── fonts.ts          Self-hosted variable fonts
│   └── globals.css       Design tokens (brand → semantic → Tailwind)
├── assets/fonts/         Archivo + Noto Sans Lao (SIL OFL)
├── components/
│   ├── ui/               shadcn/ui primitives (owned source, edit freely)
│   ├── shared/           Used by both the public site and the CMS
│   ├── public/           Public website components
│   └── admin/            CMS components
├── config/               Brand defaults, locales, technical site config
├── hooks/                Client hooks
├── i18n/messages/        UI strings per locale (content lives in the DB)
├── lib/
│   ├── env/              Zod-validated environment (public / server-only)
│   ├── theme/            Brand token validation
│   └── auth, db, storage, validation, permissions   (later phases)
├── server/               actions / services / repositories (business logic)
└── types/
```

Prisma lives at the repository root in `prisma/` (the location Prisma's
tooling expects) rather than under `src/`. The generated client is written to
`src/generated/prisma` (git-ignored).

## Authentication

The CMS lives at `/admin` (sign-in page: `/admin/login`). Accounts are created
by administrators; there is no public sign-up.

- **Passwords:** Argon2id, 12–128 characters. Reset links are single-use,
  expire after 30 minutes, are stored only as SHA-256 hashes, and revoke every
  existing session when used. Without SMTP configured, development prints the
  email (with the link) to the server console.
- **Sessions:** JWT in an HttpOnly cookie. 12 hours, or 30 days with
  "Keep me signed in". The token carries no permissions: every request
  re-checks the account (active, not deleted, session version) and loads the
  role's permissions from the database, so disabling a user or changing a role
  takes effect on the next click.
- **Brute force:** 5 failed attempts per email lock sign-in for 15 minutes
  (same response whether or not the account exists); 20 attempts per IP per
  15 minutes. Counters live in PostgreSQL, so limits hold across serverless
  instances and containers.
- **Authorization helpers** (`src/lib/auth/session.ts`): `requireUser()` and
  `requirePermission("projects.update")` for pages, `authorize()` for server
  actions, `authorizeRequest()` for route handlers (401/403 JSON).
- **Audit:** sign-ins, failures (with reason), sign-outs and password resets
  are recorded in `audit_logs`.

Required in production: `AUTH_SECRET` (32+ characters) and `AUTH_URL` (the
public URL). Use `AUTH_URL`, not `NEXTAUTH_URL`: without it Auth.js rejects the
host and every sign-in fails.

## Testing

```bash
npm test                   # unit tests
npm run test:integration   # against the database in DATABASE_URL (use a disposable one)
```

## Design system

- **Colour** is defined in three layers in `globals.css`: brand variables →
  semantic tokens (shadcn contract) → Tailwind utilities. Components only use
  semantic tokens, so changing the four brand colours re-themes everything.
- Brand colours are injected by `<BrandStyle />` after strict hex validation,
  so values from an admin setting cannot inject CSS or HTML.
- Dark mode derives its primary colour from the brand colour automatically.
- **Type:** Archivo (with width axis for condensed display headings, via the
  `type-display` and `type-heading` utilities) and Noto Sans Lao in one font
  stack, so mixed Lao/English text needs no extra markup.
- Fonts are bundled, not fetched from Google at build time, so builds work
  offline, in Docker and on private servers.

## Adding shadcn/ui components

```bash
npx shadcn@latest add <component>
```

`components.json` is configured for the `new-york` style with the aliases
used in this project.

## Roadmap

1. ✅ Project initialization
2. ✅ Database (Prisma, schema, migrations, seed)
3. ✅ Authentication and RBAC
4. Admin layout and dashboard
5. CMS core (projects, services, news, pages, categories, tags)
6. Media library and object storage
7. Contact, inquiries and quote requests
8. Multilingual routing (Lao / English)
9. Public website
10. SEO and performance
11. Security hardening (CSP, rate limiting, audit)
12. Testing (unit, integration, E2E)
13. Documentation (SETUP, DEPLOYMENT, DATABASE, API, SECURITY)
14. Production deployment (Vercel and Docker)
