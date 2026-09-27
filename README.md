# Construction CMS

Corporate website and content management system for a construction company.
Public site in Lao and English, with a role-based admin CMS for projects,
services, news, media, inquiries and quote requests.

> **Status: Phase 1 of 14 (project foundation).** The database, authentication,
> CMS and public pages are built in later phases. See [Roadmap](#roadmap).

## Stack

| Layer      | Choice                                                          |
| ---------- | --------------------------------------------------------------- |
| Framework  | Next.js 16 (App Router, Turbopack), React 19, TypeScript strict |
| Styling    | Tailwind CSS v4, shadcn/ui (Radix), Lucide icons                |
| Validation | Zod                                                             |
| Database   | PostgreSQL + Prisma (Phase 2)                                   |
| Auth       | Auth.js with RBAC (Phase 3)                                     |
| Storage    | S3-compatible adapter: AWS S3, Cloudflare R2, MinIO (Phase 6)   |

## Requirements

- Node.js 20.9 or newer (22 LTS recommended, see `.nvmrc`)
- npm 10+

## Getting started

```bash
npm install
cp .env.example .env.local   # then fill in values
npm run dev                  # http://localhost:3000
```

In development, the design system reference is at
[http://localhost:3000/styleguide](http://localhost:3000/styleguide). It returns 404 in production.

## Scripts

| Command                | What it does                                        |
| ---------------------- | --------------------------------------------------- |
| `npm run dev`          | Development server                                  |
| `npm run build`        | Production build                                    |
| `npm run start`        | Serve the production build                          |
| `npm run typecheck`    | Generate route types, then run `tsc --noEmit`       |
| `npm run lint`         | ESLint, failing on any warning                      |
| `npm run lint:fix`     | ESLint with autofix                                 |
| `npm run format`       | Format everything with Prettier                     |
| `npm run format:check` | Verify formatting without writing                   |
| `npm run check`        | typecheck + lint + format:check (run before commit) |

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

Prisma will live at the repository root in `prisma/` (the location Prisma's
tooling expects) rather than under `src/`.

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
2. Database (Prisma, schema, migrations, seed)
3. Authentication and RBAC
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
