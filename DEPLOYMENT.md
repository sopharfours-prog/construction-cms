# Deployment

Two supported targets:

|             | Private server (Docker)                             | Vercel                                              |
| ----------- | --------------------------------------------------- | --------------------------------------------------- |
| Runs        | Nginx, Next.js, PostgreSQL, MinIO on one Linux host | Next.js on Vercel; you provide PostgreSQL and S3/R2 |
| Files       | MinIO, served by Nginx at `/files`                  | AWS S3 or Cloudflare R2                             |
| Upload size | Up to 100 MB (videos)                               | **4.5 MB per request** (Vercel limit)               |
| You manage  | OS updates, TLS renewal (automated), backups        | Database and storage backups                        |

Whatever the target, go through the operator checklist in
[SECURITY.md](SECURITY.md#operator-checklist) before launch.

---

## A. Private server with Docker

`docker-compose.prod.yml` runs:

```text
Internet ──443/80──▶ nginx ──▶ app (Next.js, port 3000)
                       │         ├──▶ postgres
                       └─/files─▶ minio ◀──┘
```

Only Nginx publishes ports. The app, database and storage are on an internal
Docker network, so every request reaches the app through Nginx, which
overwrites `X-Forwarded-For`: rate limits and audit-log IP addresses can't be
spoofed. **Never publish the app's port 3000 directly.**

One-off services run first: `migrate` (applies database migrations) and
`minio-init` (creates the bucket; `public/` is readable by anyone,
`private/` holds customer attachments and is not). The app starts only after
both succeed.

### Requirements

- Linux server (Ubuntu 22.04/24.04 or similar) with 2 vCPU, 4 GB RAM and
  30 GB disk to start; more disk for photos and videos
- Docker Engine 24+ with the Compose plugin
- A domain whose DNS `A`/`AAAA` record points at the server
- Ports 80 and 443 open; everything else closed (e.g. `ufw allow 22,80,443/tcp`)

### 1. Configure

```bash
git clone <repository-url> /srv/construction-cms
cd /srv/construction-cms
cp deploy/env.production.example .env.production
chmod 600 .env.production
```

Fill in `.env.production`: `DOMAIN`, `AUTH_SECRET`
(`openssl rand -base64 32`), `POSTGRES_PASSWORD`, `MINIO_ROOT_PASSWORD`
(different random values), SMTP settings, and for the first run
`SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`. Set `ALLOW_INDEXING=true` only for
the real public site.

### 2. Get a TLS certificate (first time only)

Nginx needs a certificate to start. Issue the first one with certbot's
standalone mode while nothing else uses port 80:

```bash
docker run --rm -p 80:80 \
  -v "$PWD/deploy/certbot/conf:/etc/letsencrypt" \
  certbot/certbot:v3.3.0 certonly --standalone \
  -d example.com --email you@example.com --agree-tos --no-eff-email
```

Renewal is then automatic: the `certbot` service renews through Nginx every
12 hours when due. Reload Nginx after a renewal to pick up the new
certificate (monthly cron: `docker compose -f docker-compose.prod.yml exec nginx nginx -s reload`).

### 3. Start

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
docker compose -f docker-compose.prod.yml --env-file .env.production ps
```

`--build` builds the images from this repository (a few minutes the first
time). Check `https://example.com/api/health` returns `{"status":"ok"}`.

### 4. Seed (first time only)

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production run --rm migrate npm run db:seed
```

This creates the languages, permissions, roles, default settings and the
first Super Administrator. With `SEED_SAMPLE_DATA=false` (default here) no
demo content is created. Then **remove `SEED_ADMIN_PASSWORD` from
`.env.production`**, sign in at `https://example.com/admin/login`, and fill
in Website Settings.

### Updating

```bash
cd /srv/construction-cms
./scripts/backup.sh                       # always back up first
git pull
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
```

Migrations run automatically (`migrate` service) before the new app version
starts, and they never delete data. If a migration fails, Compose reports the
error and the new app version is not started; check `logs migrate`, fix, and
run the command again.

### Backups

`scripts/backup.sh` writes a PostgreSQL dump and a copy of all stored files
to `backups/<timestamp>/` and keeps 14 days. Database and files are copied
together, so a restore is consistent. Schedule it daily and **copy the
backups to another machine** (a backup on the same disk is not a backup):

```cron
15 2 * * * cd /srv/construction-cms && ./scripts/backup.sh >> backups/backup.log 2>&1
```

Restore (stops the app briefly):

```bash
C="docker compose -f docker-compose.prod.yml --env-file .env.production"
$C stop app
$C exec -T postgres pg_restore --clean --if-exists --no-owner -U cms -d construction_cms < backups/<stamp>/database.dump
$C run --rm --no-deps -v "$PWD/backups/<stamp>:/backup" --entrypoint /bin/sh minio-init -c \
  'mc alias set local http://minio:9000 "$MINIO_ROOT_USER" "$MINIO_ROOT_PASSWORD" && mc mirror --overwrite /backup/files local/$S3_BUCKET'
$C start app
```

Test a restore on a spare machine at least once.

### Operations

| Task                                | Command (prefix `docker compose -f docker-compose.prod.yml --env-file .env.production`)                                       |
| ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Logs                                | `logs -f app` (also `nginx`, `postgres`)                                                                                      |
| Status and health                   | `ps`                                                                                                                          |
| Database shell                      | `exec postgres psql -U cms construction_cms`                                                                                  |
| MinIO console                       | `ssh -L 9001:127.0.0.1:9001 server`, then <http://localhost:9001>                                                             |
| Unlock a user after failed sign-ins | `exec postgres psql -U cms construction_cms -c "UPDATE users SET failed_login_attempts=0, locked_until=NULL WHERE email='…'"` |
| Restart the app                     | `restart app`                                                                                                                 |

### Variations

- **Behind Cloudflare or another proxy:** Nginx then sees the proxy's address.
  Configure `set_real_ip_from` with the proxy's ranges and `real_ip_header`
  (e.g. `CF-Connecting-IP`) in the Nginx template, so `$remote_addr` is the
  visitor again.
- **LAN-only server** (domain resolves to a private IP): set
  `IMAGES_ALLOW_LOCAL_IP=true` so the image optimizer may fetch `/files`.
- **Without Docker** (Node.js directly): `npm ci`, then
  `NEXT_OUTPUT=standalone npm run build`, copy `.next/static` and `public`
  into `.next/standalone`, run `node .next/standalone/server.js` under
  systemd behind Nginx (same Nginx settings as the template, in particular
  `proxy_set_header X-Forwarded-For $remote_addr`). Run `npm run db:deploy`
  before each start of a new version.
- **External S3 or R2 instead of MinIO:** set the `S3_*` variables of the
  app to your provider and remove `minio`, `minio-init` and the `/files`
  location. Make only `public/` publicly readable.

---

## B. Vercel

### 1. Services

- **PostgreSQL:** any managed PostgreSQL 16+ (Neon, Supabase, AWS RDS…). Use
  its **pooled** connection string for `DATABASE_URL` (serverless functions
  open many connections).
- **Storage:** Cloudflare R2 or AWS S3. Create a bucket and make only the
  `public/` prefix publicly readable:
  - R2: public access applies to the **whole bucket** (R2 has no per-prefix
    policies), which would include customer attachments under `private/`.
    Connect a custom domain (e.g. `files.example.com`), keep the r2.dev URL
    **disabled**, and add a Cloudflare WAF custom rule on that domain that
    blocks requests whose URI path starts with `/private/`. Set
    `S3_PUBLIC_URL=https://files.example.com`. (Keys are random UUIDs, but
    don't rely on that alone.)
    Images from that domain are allowed automatically (derived from
    `S3_PUBLIC_URL`).
  - S3: bucket policy allowing `s3:GetObject` on `arn:aws:s3:::BUCKET/public/*`
    only; `S3_PUBLIC_URL=https://BUCKET.s3.REGION.amazonaws.com` (or a
    CloudFront URL).
- **SMTP:** any provider (e.g. Amazon SES, Postmark, Brevo).

### 2. Project

Import the repository in Vercel (framework: Next.js; build command and output
are detected). Set these environment variables for **Production**:

| Variable                                                                                   | Value                                                         |
| ------------------------------------------------------------------------------------------ | ------------------------------------------------------------- |
| `NEXT_PUBLIC_SITE_URL`, `AUTH_URL`                                                         | `https://example.com`                                         |
| `AUTH_SECRET`                                                                              | `openssl rand -base64 32`                                     |
| `DATABASE_URL`                                                                             | pooled connection string                                      |
| `STORAGE_DRIVER`                                                                           | `s3` (the app refuses `local` on Vercel: files would be lost) |
| `S3_ENDPOINT`, `S3_REGION`, `S3_BUCKET`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`, `S3_PUBLIC_URL` | see `.env.example`; R2: `S3_REGION=auto`                      |
| `SMTP_*`                                                                                   | your provider                                                 |
| `ALLOW_INDEXING`                                                                           | `true` on production only                                     |

Give preview deployments **their own database and bucket** (or no
database), never production's.

### 3. Migrations and seed

Vercel builds need no database. Apply migrations before a release reaches
production, from your machine or CI, against the production database:

```bash
DATABASE_URL='<production url, direct not pooled>' npm run db:deploy
DATABASE_URL='…' SEED_ADMIN_EMAIL=… SEED_ADMIN_PASSWORD=… SEED_SAMPLE_DATA=false npm run db:seed   # first time
```

Alternatively set the Production build command to
`npm run db:deploy && npm run build` (with a direct `DATABASE_URL` available
at build time). Don't do this for preview builds.

### Vercel limits

- Request bodies are limited to **4.5 MB**: large photos, videos and
  attachments can't be uploaded through the site. Resize photos before
  uploading, or use the Docker deployment if large uploads are needed.
- Sign-in rate limits, sessions and scheduled news work unchanged (they use
  PostgreSQL, not memory).

---

## Continuous integration

`.github/workflows/ci.yml` runs on every push and pull request: typecheck,
lint, format, unit tests, migrations and seed on a fresh PostgreSQL,
integration tests, production build, then the Playwright end-to-end tests
(the report is uploaded when they fail).

## Troubleshooting

| Symptom                                     | Fix                                                                                                                                                     |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `nginx` won't start: certificate not found  | Issue the first certificate (step 2) before `up`.                                                                                                       |
| Every sign-in returns 500 (`UntrustedHost`) | `AUTH_URL` must equal the public URL (`https://…`).                                                                                                     |
| Forms answer 403 `origin`                   | The browser's origin differs from the host Nginx forwards. Keep `proxy_set_header Host $http_host` and `X-Forwarded-Host $http_host` from the template. |
| Images from `/files` don't show in pages    | The app container must reach `https://DOMAIN`. On LAN-only servers set `IMAGES_ALLOW_LOCAL_IP=true`.                                                    |
| Uploads over ~100 MB fail with 413          | Intended limit (`client_max_body_size`).                                                                                                                |
| `migrate` exits with an error               | `docker compose … logs migrate`; the app is not started until migrations succeed.                                                                       |
| Emails not sent                             | Check SMTP variables and `logs app` for `[notify]` lines. Requests are stored even when email fails.                                                    |
