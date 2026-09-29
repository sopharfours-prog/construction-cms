# Local development setup

This guide takes a fresh machine to a running site with sample content.
For production, see [DEPLOYMENT.md](DEPLOYMENT.md).

## 1. Prerequisites

- **Node.js 20.9 or newer** (22 LTS recommended) and npm
- **PostgreSQL 16 or newer**. The included `docker-compose.yml` starts one;
  any other PostgreSQL works too.
- Git

## 2. Install

```bash
git clone <repository-url> construction-cms
cd construction-cms
npm install
```

`npm install` also runs `prisma generate` (postinstall), which writes the
database client to `src/generated/prisma` (not committed).

## 3. Environment

```bash
cp .env.example .env
```

Set at least:

| Variable                  | Value for development                                                 |
| ------------------------- | --------------------------------------------------------------------- |
| `AUTH_SECRET`             | Output of `openssl rand -base64 32` (32+ characters)                  |
| `SEED_ADMIN_EMAIL`        | Your email (default `admin@example.com`)                              |
| `SEED_ADMIN_PASSWORD`     | 12+ characters. Only read when the admin doesn't exist yet            |
| `SEED_DEMO_USER_PASSWORD` | Optional: creates one demo account per role (for testing permissions) |

Everything else has working development defaults: `DATABASE_URL` matches the
Docker database, files are stored in `./storage`, and without `SMTP_HOST`
emails (password links, notifications) are printed to the server console.

All variables are documented in [.env.example](.env.example). The ones that
matter most:

| Variable               | Notes                                                                               |
| ---------------------- | ----------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_SITE_URL` | Public URL, no trailing slash. Used in links, sitemap and emails                    |
| `AUTH_URL`             | Same public URL. Use `AUTH_URL`, not the older `NEXTAUTH_URL` (see Troubleshooting) |
| `DATABASE_URL`         | PostgreSQL connection string                                                        |
| `STORAGE_DRIVER`       | `local` (disk, default) or `s3` (AWS S3, Cloudflare R2, MinIO)                      |
| `ALLOW_INDEXING`       | Keep `false` except on production                                                   |

## 4. Database

```bash
docker compose up -d        # PostgreSQL 17 on 127.0.0.1:5432 (data kept in a volume)
npm run db:deploy           # apply all migrations
npm run db:seed             # languages, permissions, roles, admin, sample content
```

The seed is idempotent: run it again at any time. Sample content (projects,
services, news, inquiries…) is created when `SEED_SAMPLE_DATA=true` (default
outside production). After the first run, remove `SEED_ADMIN_PASSWORD` from
`.env`.

To change the schema: edit `prisma/schema.prisma`, then
`npm run db:migrate -- --name what_changed` creates and applies a migration.
See [DATABASE.md](DATABASE.md#writing-migrations).

## 5. Run

```bash
npm run dev
```

- Public site: <http://localhost:3000> (redirects to `/lo` or `/en`)
- CMS: <http://localhost:3000/admin>, sign in with the seeded admin

## 6. Check your work

```bash
npm run check                       # typecheck, lint, format, unit tests
npm run test:integration            # needs a database; creates and removes its own rows
npm run build && npm run start      # production build (no database needed to build)
```

End-to-end tests: see [e2e/README.md](e2e/README.md).

Use a separate database for integration and end-to-end tests, e.g.
`DATABASE_URL=…/construction_cms_test`, migrated and seeded the same way.

## Working on the code

- **Where things go:** pages and routes in `src/app`, business logic in
  `src/server/services`, server actions in `src/server/actions`, validation in
  `src/lib/validation`, UI in `src/components`. Services never import UI or
  Auth.js, so they can be tested directly.
- **Every mutation** goes through `runAction()` (server actions) or `apiRoute()`
  (route handlers): permission check, Zod validation, service call, safe error.
- **Text** is never hard-coded in components: public text is in
  `src/i18n/messages/{lo,en}.ts`, CMS text in `src/i18n/admin/{lo,en}.ts`.
  A unit test fails if the two languages don't have the same keys.
- **New CMS page:** add the route under `src/app/admin/(protected)`, call
  `requirePermission()` first, then add it to `src/config/admin-nav.ts`
  (a test checks that every menu item has a page).
- **UI components:** `npx shadcn@latest add <component>` (the `new-york` style
  and project aliases are configured in `components.json`).

### Design system

- Colour has three layers in `src/app/globals.css`: brand variables → semantic
  tokens (the shadcn contract) → Tailwind utilities. Components only use
  semantic tokens, so the four brand colours (Website Settings → Appearance)
  re-theme the site and the CMS.
- Brand colours are validated as `#rrggbb` before being written into CSS, so a
  setting can't inject CSS or HTML.
- Type: Archivo (condensed headings via `type-display` / `type-heading`) with
  Noto Sans Lao in the same stack, bundled locally (builds work offline).

## Troubleshooting

| Symptom                                                     | Cause and fix                                                                                                                                            |
| ----------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Every sign-in fails with HTTP 500, log says `UntrustedHost` | `AUTH_URL` is missing or doesn't match the URL you use. Set it to the exact public URL (not `NEXTAUTH_URL`).                                             |
| Seed stops: "SEED_ADMIN_PASSWORD is required"               | Set a 12+ character password in `.env` for the first run.                                                                                                |
| Sign-in blocked after several attempts                      | 5 failures lock that email for 15 minutes. In development: `DELETE FROM rate_limits;` and `UPDATE users SET failed_login_attempts=0, locked_until=NULL;` |
| Contact form says "too many messages"                       | 5 submissions per IP per 10 minutes. Same fix as above for `rate_limits`.                                                                                |
| "Storage is misconfigured" in the log on upload             | `STORAGE_DRIVER=s3` without all `S3_*` variables. The log lists the missing ones.                                                                        |
| Images from MinIO on a LAN address don't load               | Next.js blocks private IPs in the image optimizer; set `IMAGES_ALLOW_LOCAL_IP=true` (only for a MinIO you control).                                      |
| Emails not delivered in development                         | Expected without `SMTP_HOST`: they are printed in the server console.                                                                                    |
| `npm install` fails with ERESOLVE about nodemailer          | Use the committed `package.json` (it contains an `overrides` entry for next-auth's optional nodemailer peer).                                            |
