# Security

This document describes how the system protects itself, the risks that are
knowingly accepted, and what operators must do. Report vulnerabilities
privately to the site owner (see "Reporting" below), not in public issues.

## Measures

### Authentication and sessions

- Passwords: **Argon2id** (19 MiB memory, 2 passes), 12–128 characters, never
  stored or logged in plain text. Hashes are upgraded automatically on sign-in
  when parameters change.
- Sessions: JWT in an HttpOnly, SameSite=Lax cookie (Secure on HTTPS);
  12 hours, or 30 days with "Keep me signed in". The token holds no
  permissions: every request re-checks the account and loads permissions from
  the database, so disabling a user or changing a role applies immediately.
  Disabling, a password change, an email change or a reset ends every session
  (session version).
- Brute force: 5 failed attempts per email lock sign-in for 15 minutes (same
  answer whether or not the account exists); 20 attempts per IP per 15 minutes.
  Counters are in PostgreSQL, so they hold across instances.
- Password reset: single-use link valid 30 minutes, stored only as a SHA-256
  hash; the public "forgot password" form never reveals whether an email exists.

### Authorization (RBAC)

- Permissions are data (`projects.update`, `news.publish`, …) assigned to
  roles. Every server action and API route checks them on the server; the UI
  only hides what a user can't use.
- Privilege escalation is blocked: nobody can grant a permission, assign a
  role, or act on a user holding permissions they don't have themselves. Users
  can't disable, delete or demote themselves, the last active Super
  Administrator can't be removed, and the Super Administrator role always keeps
  every permission.

### Input, output and files

- All input is validated with Zod on the server (the same schemas as the
  forms). PostgreSQL access goes through Prisma's parameterised queries; the
  few raw queries use tagged templates (parameterised).
- Rich text is stored as editor JSON filtered by an allow-list (no HTML,
  links limited to http(s), mailto, tel and site paths) and rendered as React
  elements. JSON-LD is escaped so content can't close its script element.
- Uploads: type detected from file content (not name or browser type), per
  kind size limits, server-generated storage keys, SVG and executables
  refused. Images are re-encoded (EXIF including GPS location removed,
  pixel-count cap against decompression bombs). Customer attachments are
  private and downloadable only by authorised staff, as sandboxed attachments.
- Emails: header values are single-line (no header injection); HTML bodies
  are escaped.

### Transport and browser

- Security headers on every response: `X-Content-Type-Options: nosniff`,
  `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`,
  `Permissions-Policy`, `Cross-Origin-Opener-Policy`, and HSTS in production.
- **Content-Security-Policy**
  - CMS: a new nonce per request with `'strict-dynamic'`; only scripts
    Next.js emits for that request can run.
  - Public site: pages are cached (ISR) and a nonce would force every page to
    render per request, so inline scripts are allowed there (Next.js puts its
    page data in inline scripts). Everything else is restricted: no plugins,
    no framing of the site, `base-uri` and `form-action` limited to the site,
    sources limited to the site, the storage host, Google Analytics and the
    Google Maps embed. XSS is prevented at the source (above).
  - APIs and served files: `default-src 'none'`.
- CSRF: server actions are protected by Next.js; cookie-authenticated API
  writes require a same-origin `Origin` header.
- Public forms: honeypot, signed timing token, rate limits per IP and email.
- The CMS sends `X-Robots-Tag: noindex` and `Cache-Control: private, no-store`.
  The public site is not indexed unless `ALLOW_INDEXING=true`.

### Errors and logging

- Users see generic messages; database errors, stack traces and secrets stay
  in the server log. Production error pages show only an opaque reference.
- The audit log (`/admin/audit-logs`, Super Administrator only) is
  append-only, enforced by a database trigger. It records sign-ins, failures,
  sign-outs (with IP and browser), content changes, publishing, uploads,
  permission, user and settings changes, with before/after values. Secrets
  are removed before writing.

## Known and accepted risks

| Item                                                                                               | Assessment                                                                                                                                                                                                                                       |
| -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `npm audit` reports high-severity advisories in `mysql2` and `deepmerge-ts` through the Prisma CLI | `mysql2` is never loaded (the app uses PostgreSQL); `deepmerge-ts` only merges Prisma's own config at start-up, with no user input. Fixed in Prisma 8, which is a release candidate at the time of writing. **Upgrade when Prisma 8 is stable.** |
| Public pages allow inline scripts in CSP                                                           | Required for cached pages (see above). Mitigated by output encoding, the rich-text allow-list and no HTML input anywhere.                                                                                                                        |
| `experimental.globalNotFound` (Next.js)                                                            | Documented pattern for sites with several root layouts. Re-check when upgrading Next.js.                                                                                                                                                         |
| Next.js "Failed to find Server Action" returns 500 for forged action ids                           | Framework behaviour; no action runs and no data changes.                                                                                                                                                                                         |
| The public "forgot password" and form endpoints can be used to send email to an address            | Rate-limited per IP and per email.                                                                                                                                                                                                               |

## Operator checklist

Before going live:

- [ ] `AUTH_SECRET` is a fresh random value (`openssl rand -base64 32`), different per environment, and kept secret.
- [ ] `AUTH_URL` and `NEXT_PUBLIC_SITE_URL` are the public HTTPS URL.
- [ ] The site is served only over HTTPS; HTTP redirects to HTTPS.
- [ ] `SEED_ADMIN_PASSWORD` and `SEED_DEMO_USER_PASSWORD` are removed after seeding; no demo accounts exist in production (`SEED_DEMO_USER_PASSWORD` empty).
- [ ] PostgreSQL is not reachable from the internet; the app uses a dedicated database user.
- [ ] Object storage: `public/` is publicly readable, `private/` is **not**; access keys are limited to the one bucket.
- [ ] SMTP is configured, so password links and notifications are delivered.
- [ ] `ALLOW_INDEXING=true` only on production.
- [ ] Backups of the database and storage run and a restore has been tested ([DEPLOYMENT.md](DEPLOYMENT.md)).
- [ ] Only people who need them have Super Administrator.

Optional: add the domain to the HSTS preload list only if every subdomain is
HTTPS-only, now and in the future (it is hard to undo, so it is not enabled
by default).

## Maintenance

- Review `npm audit --omit=dev` monthly and after upgrades; test email
  delivery and file uploads after upgrading nodemailer or sharp.
- `next-auth` is pinned to a v5 beta; follow its releases for security fixes.
- Review the audit log for unexpected permission or settings changes.

## Reporting

Please report suspected vulnerabilities privately to the site owner's
technical contact, with steps to reproduce. Don't access data that isn't
yours and don't disrupt the service.
