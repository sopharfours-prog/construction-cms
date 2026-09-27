# Database

PostgreSQL 15+ (tested on 16) with Prisma ORM 7.

- Schema: [`prisma/schema.prisma`](prisma/schema.prisma)
- Migrations: [`prisma/migrations/`](prisma/migrations)
- Prisma config (connection URL, seed command): [`prisma.config.ts`](prisma.config.ts)
- Seed: [`prisma/seed.ts`](prisma/seed.ts) and [`prisma/seed/`](prisma/seed)
- Runtime client: [`src/lib/db/client.ts`](src/lib/db/client.ts)

## Quick start

```bash
docker compose up -d          # PostgreSQL on 127.0.0.1:5432
cp .env.example .env          # set DATABASE_URL and SEED_ADMIN_PASSWORD
npm install                   # also runs `prisma generate`
npm run db:deploy             # apply migrations
npm run db:seed               # roles, permissions, admin, sample content
```

Prisma 7 reads `.env` (via `dotenv` in `prisma.config.ts`); Next.js reads
`.env` too, so one file serves both in development. Remove
`SEED_ADMIN_PASSWORD` from `.env` after the first seed.

## Scripts

| Command               | Use                                                              |
| --------------------- | ---------------------------------------------------------------- |
| `npm run db:migrate`  | Development: create a migration from schema changes and apply it |
| `npm run db:deploy`   | Production/CI: apply pending migrations only, never generates    |
| `npm run db:status`   | Show applied and pending migrations                              |
| `npm run db:seed`     | Run the idempotent seed                                          |
| `npm run db:reset`    | **Development only.** Drop everything, re-migrate, re-seed       |
| `npm run db:studio`   | Browse data in Prisma Studio                                     |
| `npm run db:generate` | Regenerate the client (also runs on `npm install` and `build`)   |

The generated client lives in `src/generated/prisma` and is git-ignored.

## Conventions

| Convention         | Detail                                                                                                            |
| ------------------ | ----------------------------------------------------------------------------------------------------------------- |
| IDs                | UUIDv7 (`@default(uuid(7))`, native `uuid`). Time-ordered, so B-tree indexes stay compact unlike random UUIDv4.   |
| Naming             | `snake_case` tables/columns in PostgreSQL, `camelCase` in TypeScript (`@map`/`@@map`).                            |
| Timestamps         | `created_at`, `updated_at` on every mutable table (UTC, `timestamp(3)`).                                          |
| Soft delete        | `deleted_at` on `users`, `projects`, `services`, `news`, `pages`, `media`. Repositories filter `deletedAt: null`. |
| Money              | `Decimal(18,2)` plus a 3-letter `currency` (default `LAK`). Never floats.                                         |
| Dates without time | `@db.Date` (project start/completion, certification dates).                                                       |

### Soft delete and slugs

`slug` columns are globally unique. When a row is soft-deleted, the
repository rewrites its slug to `<slug>-deleted-<short id>` in the same
transaction, so the original slug can be reused. Restoring re-checks the
original slug is free. (PostgreSQL partial unique indexes would also work,
but Prisma cannot model them, so they would show up as drift.)

## Multilingual content

Translatable text lives in `*_translations` tables with one row per locale:

```
projects ──< project_translations (project_id, locale) UNIQUE
                     │
                     └── locale ──> languages.code
```

- `languages` is a table, not an enum. **Adding a language is an INSERT plus a
  UI message file; no migration.** A foreign key stops translations for
  unknown locales.
- Non-translatable fields (dates, status, budget, slug, relations) stay on the
  parent table.
- A missing translation falls back to the default language at read time.
- Settings with translatable values store `{ "lo": "…", "en": "…" }` objects.

Translation tables: projects, project images (alt text, caption), services,
news, pages, categories, tags, team members, certifications, milestones.

## Model overview

**Identity and access:** `users`, `roles`, `permissions`, `role_permissions`,
`password_reset_tokens`.

**Content:** `projects` (+ `project_images`, `project_services`), `services`,
`news` (+ `news_tags`), `pages`, `categories` (type `PROJECT` or `NEWS`),
`tags`, and About-page lists: `team_members`, `certifications`, `milestones`.

**Media:** `media`, `media_folders`. Files live in object storage; rows hold
the storage key, public URL and metadata (MIME type, size, dimensions, blur
placeholder).

**Customer communication:** `inquiries` (+ `inquiry_attachments`,
`inquiry_notes`), `quote_requests` (+ `quote_attachments`, `quote_notes`).
Customer attachments are **not** media-library files: they are private, stored
under a non-public prefix and only downloadable through a permission-checked
route.

**System:** `settings` (key → JSON), `audit_logs`, `languages`.

### Publication status

One `ContentStatus` enum (`DRAFT`, `PUBLISHED`, `SCHEDULED`, `ARCHIVED`) is
shared. Projects, services and pages use `DRAFT`/`PUBLISHED`; news uses all
four. Allowed values per module are enforced by Zod schemas. A scheduled item
is public when `status = SCHEDULED AND published_at <= now()`, so no cron job
is required for correctness.

`projects.project_status` (`COMPLETED`, `ONGOING`, `UPCOMING`) is the
construction state, independent of publication.

### Rich text

Stored as ProseMirror/Tiptap JSON (`jsonb`), never HTML. The public site
renders it through an allow-list of node and mark types, so stored content
cannot carry scripts.

## Roles and permissions

- **What permissions exist** is code: `src/lib/permissions/registry.ts`.
  Checks are type-safe (`can("projects.update")`).
- **Who holds them** is data: `role_permissions`, editable by a Super
  Administrator with `roles.manage`.
- Initial assignments: `src/lib/permissions/default-roles.ts`.

| Role                | Permissions                                              |
| ------------------- | -------------------------------------------------------- |
| Super Administrator | all 40                                                   |
| Administrator       | 33: all content, media, inquiries, quotes; settings view |
| Content Editor      | 14: news, pages, taxonomy, media                         |
| Project Editor      | 9: projects, service view, media (no delete)             |
| Viewer              | 10: every `.view` except `audit.view`                    |

The seed syncs `permissions` with the registry (adds, updates, removes). It
never overwrites role assignments an administrator changed, except that
`SUPER_ADMIN` is always re-granted every permission.

`users.session_version` is incremented on password change, disable or role
change; sessions carrying an older version are rejected (Phase 3).

## Constraints enforced by PostgreSQL

Besides foreign keys and unique indexes, the initial migration adds rules
Prisma's schema language cannot express (see the end of
`prisma/migrations/*_init/migration.sql`):

| Rule                                                         | Mechanism                                                                                                      |
| ------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------- |
| Emails stored lower-case (makes uniqueness case-insensitive) | `CHECK (email = lower(email))`                                                                                 |
| At most one default language                                 | partial unique index                                                                                           |
| Slugs are `a-z`, `0-9` and single hyphens                    | `CHECK` with regex, on 6 tables                                                                                |
| Budgets and file sizes are non-negative                      | `CHECK`                                                                                                        |
| Completion date is not before start date                     | `CHECK`                                                                                                        |
| Media width and height are positive                          | `CHECK`                                                                                                        |
| **Audit logs are append-only**                               | trigger rejects `UPDATE`/`DELETE`; the only allowed update is `user_id → NULL` when a user row is hard-deleted |

Purging old audit logs (for a retention policy) therefore needs a deliberate
database-administrator action (`ALTER TABLE audit_logs DISABLE TRIGGER …`),
never application code.

### Delete behaviour

| Relation                                                    | On delete                                          |
| ----------------------------------------------------------- | -------------------------------------------------- |
| Entity → its translations, gallery rows, notes, attachments | `CASCADE`                                          |
| Content → category, cover image, author, assignee           | `SET NULL`                                         |
| User → role                                                 | `RESTRICT` (reassign users before deleting a role) |
| Gallery row → media file                                    | `RESTRICT` (a file in use cannot be deleted)       |
| Translation → language                                      | `RESTRICT`                                         |

## Writing migrations

1. Edit `prisma/schema.prisma`.
2. `npm run db:migrate -- --name describe_change`
3. Review the generated SQL and commit schema + migration together.

For constraints Prisma cannot model, generate the migration with
`npm run db:migrate -- --create-only --name …`, append SQL at the end of
`migration.sql`, then run `npm run db:migrate`.

Never edit a migration that has been applied to a shared database: Prisma
stores a checksum of each file. Add a new migration instead.

In production, run `npm run db:deploy` before starting the new version. It
only applies committed migrations and never resets data.

## Seed

| Variable                  | Purpose                                                                       |
| ------------------------- | ----------------------------------------------------------------------------- |
| `SEED_ADMIN_EMAIL`        | First Super Administrator (default `admin@example.com`)                       |
| `SEED_ADMIN_PASSWORD`     | Required only while that account does not exist; min 12 characters            |
| `SEED_SAMPLE_DATA`        | Sample company content. Default `true`, or `false` when `NODE_ENV=production` |
| `SEED_DEMO_USER_PASSWORD` | Optional: one demo account per role. Leave empty in production                |

The seed is idempotent. It creates sample records only when their slug is
free and never changes an existing admin's password. With sample data off,
neutral default settings are created instead.

No images are seeded. Upload real photos through the Media Library (Phase 6);
pages show a neutral placeholder until then.

## Backups

Use `pg_dump` for logical backups, for example daily:

```bash
pg_dump --format=custom --no-owner "$DATABASE_URL" > backup-$(date +%F).dump
pg_restore --clean --no-owner --dbname "$DATABASE_URL" backup-2026-09-27.dump
```

Back up object storage separately: the database stores only file keys.
