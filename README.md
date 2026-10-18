# Construction CMS

Company website and content management system for a construction contractor,
in **Lao** and **English**. The public site presents services, projects and
news and collects enquiries and quote requests; the CMS lets staff manage all
of it with role-based permissions and a full audit trail.

> **Status:** complete (phases 1–14): public site, CMS, tests, documentation,
> Docker and Vercel deployment.

## Features

**Public website** (`/lo`, `/en`): home page, about (team, certifications,
history), services, projects with search and filters and a full-screen
gallery, news with categories and tags, contact form and quote requests with
attachments, privacy and terms pages. Fully responsive, accessible, cached
(ISR) and SEO-ready: canonical and hreflang links, Open Graph, sitemap,
robots.txt and JSON-LD (GeneralContractor, BreadcrumbList, NewsArticle,
Project).

**CMS** (`/admin`): dashboard, projects (bilingual content, gallery,
specifications, publish workflow), services (ordering), news (draft,
published, scheduled, archived), pages, About-page content, categories and
tags, media library (S3/R2/MinIO or local disk, drag-and-drop, folders,
replace, usage tracking), inquiries and quote requests (status, assignment,
notes, email replies, private attachments), live chat with website visitors
(chat bubble on every public page, answered from a CMS inbox), users, roles and permissions
(with optional staff account requests that an administrator approves, and
a self-service account page for changing one's password),
website settings (company, contact, social, SEO, brand colours, languages)
and an append-only audit log. The CMS itself is available in Lao and English.

## Stack

| Area       | Choice                                                                                    |
| ---------- | ----------------------------------------------------------------------------------------- |
| Framework  | Next.js 16 (App Router, Server Components, Server Actions), React 19, TypeScript (strict) |
| UI         | Tailwind CSS 4, shadcn/ui (Radix), Lucide icons, Tiptap editor                            |
| Data       | PostgreSQL 16+ with Prisma 7 (`@prisma/adapter-pg`)                                       |
| Auth       | Auth.js v5 (credentials), Argon2id password hashing, database-backed RBAC                 |
| Files      | S3-compatible storage (AWS S3, Cloudflare R2, MinIO) or local disk; sharp for images      |
| Validation | Zod 4, shared by forms, server actions and the REST API                                   |
| Tests      | Vitest (unit, integration against PostgreSQL), Playwright (end-to-end)                    |

## Quick start

Requires **Node.js 20.9+** (22 LTS recommended) and **PostgreSQL 16+**
(Docker is easiest). Full details and troubleshooting: [SETUP.md](SETUP.md).

```bash
# 1. Install
npm install                      # also generates the Prisma client

# 2. Environment
cp .env.example .env
#    set AUTH_SECRET (openssl rand -base64 32) and SEED_ADMIN_PASSWORD (12+ chars)

# 3. Database
docker compose up -d             # PostgreSQL on 127.0.0.1:5432
npm run db:deploy                # apply migrations
npm run db:seed                  # roles, permissions, admin, sample content

# 4. Develop
npm run dev                      # http://localhost:3000 → /lo, CMS at /admin
```

Sign in at `/admin/login` with `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD`,
then remove the password from `.env`.

### Build and run in production mode

```bash
npm run build                    # no database needed at build time
npm run db:deploy                # on the target database, before starting
npm run start                    # serves on port 3000
```

Deployment on Docker (with Nginx and MinIO) or Vercel: [DEPLOYMENT.md](DEPLOYMENT.md).

## Scripts

| Script                                          | What it does                                                                                    |
| ----------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `dev`, `build`, `start`                         | Next.js development server, production build, production server                                 |
| `check`                                         | Everything CI runs: typecheck, lint, format check, unit tests                                   |
| `typecheck`, `lint`, `format`, `format:check`   | Individual checks                                                                               |
| `test`                                          | Unit tests (no database)                                                                        |
| `test:integration`                              | Integration tests against `DATABASE_URL` (use a test database)                                  |
| `test:e2e`                                      | Playwright end-to-end tests against a running, seeded instance ([e2e/README.md](e2e/README.md)) |
| `db:deploy`                                     | Apply pending migrations (production and CI)                                                    |
| `db:migrate`                                    | Create a migration from schema changes (development)                                            |
| `db:seed`, `db:status`, `db:reset`, `db:studio` | Seed, migration status, reset (development only), Prisma Studio                                 |

## Documentation

| Document                       | Contents                                                                   |
| ------------------------------ | -------------------------------------------------------------------------- |
| [SETUP.md](SETUP.md)           | Local development in detail, environment variables, troubleshooting        |
| [DEPLOYMENT.md](DEPLOYMENT.md) | Docker (Nginx, PostgreSQL, MinIO) and Vercel deployment, backups, upgrades |
| [DATABASE.md](DATABASE.md)     | Schema design, multilingual model, constraints, migrations, seed           |
| [API.md](API.md)               | REST endpoints, authentication, errors, examples                           |
| [SECURITY.md](SECURITY.md)     | Security measures, known risks, operator checklist, reporting              |
| [e2e/README.md](e2e/README.md) | Running the Playwright tests                                               |

## Roles

| Role                | Can                                                                             |
| ------------------- | ------------------------------------------------------------------------------- |
| Super Administrator | Everything, including users, roles, settings and the audit log                  |
| Administrator       | Projects, services, news, pages, media, inquiries, quote requests and live chat |
| Content Editor      | News, pages, About content, categories and tags, media                          |
| Project Editor      | Projects and their galleries, media (upload, edit)                              |
| Viewer              | Read-only access to the CMS                                                     |

Permissions are data (`projects.update`, `news.publish`, …): roles can be
edited and custom roles created under **Users → Roles and permissions**.
Nobody can grant permissions they don't hold themselves.

## Project structure

```text
src/
├── app/
│   ├── [locale]/          public site (root layout per language, ISR)
│   ├── admin/             CMS (its own root layout; (auth) and (protected) groups)
│   ├── api/               REST endpoints, Auth.js, health check
│   ├── media/             local-disk file serving (STORAGE_DRIVER=local)
│   ├── sitemap.ts, robots.ts, global-not-found.tsx
├── components/
│   ├── ui/                shadcn/ui primitives
│   ├── admin/             CMS screens and form building blocks
│   ├── site/              public site components and forms
│   └── shared/            used by both (root document, icons, theme)
├── config/                technical configuration (languages, navigation, brand defaults)
├── i18n/                  public and CMS dictionaries (lo, en), locale routing
├── lib/                   framework-independent code: auth, validation, storage,
│                          security (CSP, tokens), SEO, content (rich text, slugs)
├── server/
│   ├── actions/           server actions: authorize → validate → service → revalidate
│   ├── services/          business logic and database access (no UI, no auth runtime)
│   ├── public/            read-only queries for the public site
│   └── api/               helpers for REST route handlers
├── proxy.ts               language redirects, CMS session gate, CSP
└── generated/prisma/      generated client (not committed)
prisma/                    schema, migrations, seed
tests/unit, tests/integration, e2e/
```

Every mutation follows the same path: permission check on the server, Zod
validation, service call (inside a transaction with its audit log entry),
cache revalidation. The UI hides what a user can't do, but never enforces it.

## Adding a language

Content tables are already per-language. Add the code to `src/config/i18n.ts`,
translate `src/i18n/messages` and `src/i18n/admin`, and insert a row in the
`languages` table. The main language (Lao) is required for all content.

## License

Proprietary. All rights reserved by the owner of this repository.
