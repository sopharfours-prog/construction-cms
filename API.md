# REST API

The CMS screens use server actions; the same operations are available as
JSON endpoints for integrations. Both paths use the **same services, Zod
schemas, permission checks and audit logging**, so rules such as "publishing
needs `projects.publish`" or "nobody can grant permissions they lack" apply
identically.

Base URL: your site, e.g. `https://example.com`. All responses are JSON with
`Cache-Control: no-store` unless noted.

## Authentication

Endpoints (except the public ones below) use the CMS session cookie. Sign in
through `/admin/login` (or Auth.js at `/api/auth/*`) and send the cookie with
each request. There are no API keys: integrations act as a CMS user, with
that user's permissions.

**Writes need a same-origin `Origin` header** (CSRF protection for cookie
authentication). Browsers send it automatically; scripts must set it:

```bash
curl -b cookies.txt -H "Origin: https://example.com" -H "Content-Type: application/json" \
  -X POST https://example.com/api/projects --data '{ … }'
```

## Errors

```json
{ "error": "validation", "issues": { "slug": "slugInvalid", "translations.lo.title": "required" } }
{ "error": "forbidden", "field": "roleId", "reason": "beyondYourPermissions" }
```

| Status | `error`        | Meaning                                                                                                                                           |
| ------ | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| 400    | `validation`   | Invalid input. `issues` maps field paths to message keys; `reason` explains request-level problems (`jsonRequired`, `invalidJson`, `fileType`, …) |
| 401    | `unauthorized` | No valid session                                                                                                                                  |
| 403    | `forbidden`    | Missing permission, beyond your own permissions, or cross-origin write (`reason: "origin"`)                                                       |
| 404    | `notFound`     | Unknown or deleted item (also for malformed ids)                                                                                                  |
| 409    | `conflict`     | e.g. slug or email taken, file still in use (`mediaInUse`)                                                                                        |
| 413    | `tooLarge`     | Upload over the size limit                                                                                                                        |
| 429    | `rateLimited`  | Too many requests; see `Retry-After`                                                                                                              |
| 500    | `unexpected`   | Server error. Details are only in the server log                                                                                                  |

Message keys (`slugInvalid`, `required`, …) are the ones translated in
`src/i18n/admin/*.ts` under `validation`.

## Input format

Write endpoints accept the same fields as the CMS forms, as JSON. Booleans
and numbers may be sent as JSON values; dates are `YYYY-MM-DD`, scheduled
times `YYYY-MM-DDTHH:mm` in Asia/Vientiane, money as a number or string with
up to two decimals. Text per language goes under `translations.<lang>`; the
main language (`lo`) is required.

```json
{
  "slug": "vientiane-office-tower",
  "projectStatus": "ONGOING",
  "status": "DRAFT",
  "featured": true,
  "startDate": "2026-03-01",
  "budget": 12500000000,
  "currency": "LAK",
  "showBudget": false,
  "categoryId": "01a0…",
  "serviceIds": ["01a0…"],
  "coverImageId": "01a0…",
  "gallery": [{ "mediaId": "01a0…", "translations": { "en": { "altText": "North façade" } } }],
  "translations": {
    "lo": { "title": "ອາຄານຫ້ອງການ", "location": "ນະຄອນຫຼວງວຽງຈັນ" },
    "en": { "title": "Office tower", "location": "Vientiane" }
  }
}
```

`PUT` replaces the item (send every field you want to keep).

## Endpoints

### Content

| Method           | Path                | Permission                              | Notes                                                                                                                                                    |
| ---------------- | ------------------- | --------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GET              | `/api/projects`     | `projects.view`                         | Query: `q`, `status`, `projectStatus`, `category`, `year`, `sort` (`updated`, `created`, `completion`, `order`), `page`, `locale` (`lo`/`en` for titles) |
| POST             | `/api/projects`     | `projects.create`                       | → `201 { id }`. `status: "PUBLISHED"` also needs `projects.publish`                                                                                      |
| GET              | `/api/projects/:id` | `projects.view`                         | All languages, gallery, services                                                                                                                         |
| PUT              | `/api/projects/:id` | `projects.update`                       | Status changes need `projects.publish`                                                                                                                   |
| DELETE           | `/api/projects/:id` | `projects.delete`                       | Soft delete; the slug becomes reusable                                                                                                                   |
| GET              | `/api/services`     | `services.view`                         | `{ items }` in display order; `locale`                                                                                                                   |
| POST             | `/api/services`     | `services.create`                       | → `201 { id }`                                                                                                                                           |
| GET, PUT, DELETE | `/api/services/:id` | `services.view` / `.update` / `.delete` |                                                                                                                                                          |
| GET              | `/api/news`         | `news.view`                             | Query: `q`, `status` (`DRAFT`, `PUBLISHED`, `SCHEDULED`, `ARCHIVED`), `category`, `sort`, `page`, `locale`                                               |
| POST             | `/api/news`         | `news.create`                           | Any status other than draft needs `news.publish`; `SCHEDULED` needs a future `publishedAt`                                                               |
| GET, PUT, DELETE | `/api/news/:id`     | `news.view` / `.update` / `.delete`     |                                                                                                                                                          |

Writes refresh the CMS and the cached public pages.

### Media

| Method | Path                  | Permission     | Notes                                                                                                                                                       |
| ------ | --------------------- | -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GET    | `/api/media`          | `media.view`   | Query: `q`, `kind` (`IMAGE`, `VIDEO`, `DOCUMENT`), `folder` (id or `none`), `page`, `pageSize` (≤ 60)                                                       |
| POST   | `/api/media`          | `media.upload` | `multipart/form-data`: `file`, optional `folderId`, `altText` → `201` item. Type is checked from the file content; images are re-encoded (metadata removed) |
| GET    | `/api/media/:id`      | `media.view`   | Includes `usage` (where the file is shown)                                                                                                                  |
| PATCH  | `/api/media/:id`      | `media.update` | JSON: `altText`, `caption`, `folderId`                                                                                                                      |
| DELETE | `/api/media/:id`      | `media.delete` | `409 mediaInUse` while anything displays it                                                                                                                 |
| POST   | `/api/media/:id/file` | `media.upload` | Replace the file (same kind); every reference follows                                                                                                       |

Limits: images 20 MB, videos 100 MB, documents (PDF, DOCX, XLSX) 20 MB;
200 uploads per user per hour. SVG is not accepted.

### Users

| Method | Path             | Permission     | Notes                                                                                                                 |
| ------ | ---------------- | -------------- | --------------------------------------------------------------------------------------------------------------------- |
| GET    | `/api/users`     | `users.view`   | Query: `q`, `role`, `status`, `page`. Never includes password hashes                                                  |
| POST   | `/api/users`     | `users.create` | `passwordMode`: `email` (send a setup link) or `set` (with `password`, 12+ chars) → `201 { id, needsLink, linkSent }` |
| GET    | `/api/users/:id` | `users.view`   |                                                                                                                       |
| PUT    | `/api/users/:id` | `users.update` | `name`, `email`, `roleId`, `status`, `preferredLocale`, `avatarId`                                                    |
| DELETE | `/api/users/:id` | `users.delete` | Soft delete; frees the email                                                                                          |

You can't assign a role, or change a user who holds permissions, beyond your
own; you can't disable, delete or demote yourself; the last active Super
Administrator can't be removed.

### Inquiries and quote requests

| Method | Path                                           | Permission         | Notes                                                                                           |
| ------ | ---------------------------------------------- | ------------------ | ----------------------------------------------------------------------------------------------- |
| POST   | `/api/inquiries`                               | **public**         | Contact form (see below)                                                                        |
| GET    | `/api/inquiries`                               | `inquiries.view`   | Query: `q`, `status`, `assigned` (`me`, `none`, user id), `view` (`active`, `archived`), `page` |
| GET    | `/api/inquiries/:id`                           | `inquiries.view`   | With notes and attachments (IP and browser are not returned)                                    |
| PATCH  | `/api/inquiries/:id`                           | `inquiries.update` | JSON: any of `status`, `assigneeId` (or `null`), `archived`                                     |
| DELETE | `/api/inquiries/:id`                           | `inquiries.delete` | Permanent, with its files                                                                       |
| GET    | `/api/inquiries/:id/attachments/:attachmentId` | `inquiries.view`   | Download (always as an attachment, sandboxed)                                                   |
|        | `/api/quotes…`                                 | `quotes.*`         | Same as inquiries; list adds reference, project and budget                                      |

### Public endpoints

| Method | Path              | Notes                                                                                                                                                                                                                                          |
| ------ | ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GET    | `/api/form-token` | Anti-spam token for the public forms (valid from 3 s to 24 h)                                                                                                                                                                                  |
| POST   | `/api/inquiries`  | `multipart/form-data`: `name`, `email`, `phone?`, `company?`, `subject`, `message`, `locale`, `formToken`, `website` (honeypot, leave empty), up to 3 `attachments` (PDF, JPG, PNG, DOCX, 10 MB each) → `201 { ok: true }`                     |
| POST   | `/api/quotes`     | Same pattern: `customerName`, `company?`, `email`, `phone`, `serviceId?`, `projectType`, `location`, `estimatedBudget?`, `currency`, `expectedStartDate?`, `description`, up to 5 attachments → `201 { ok: true, reference: "Q-2026-000042" }` |
| GET    | `/api/health`     | `{ status: "ok", database: "ok" }` or `503`. For load balancers and Docker                                                                                                                                                                     |

Public form posts need a same-origin `Origin` header and are limited to 5 per
IP per 10 minutes and 10 per email per day. Submissions caught as spam get a
normal-looking `201` and are not stored.

### Other

- `/api/auth/*`: Auth.js (sign-in, session, CSRF token). Use the CMS login page.
- `/sitemap.xml`, `/robots.txt`: generated per request.
- `/media/*`: public files when `STORAGE_DRIVER=local`.
