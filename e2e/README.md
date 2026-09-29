# End-to-end tests (Playwright)

The tests drive a real browser against a running, seeded instance. Besides the
flows themselves they fail on any **Content-Security-Policy violation, page
error or console error**, the checks unit and integration tests can't make.

## Run

```bash
npx playwright install chromium          # once
npm run build && npm run start &         # or set E2E_BASE_URL to a running server
E2E_ADMIN_PASSWORD='…' E2E_DEMO_PASSWORD='…' npm run test:e2e
```

| Variable                                                     | Default                 | Meaning                                                   |
| ------------------------------------------------------------ | ----------------------- | --------------------------------------------------------- |
| `E2E_BASE_URL`                                               | `http://localhost:3000` | Server to test. Without it, `npm run start` is launched.  |
| `E2E_ADMIN_EMAIL` / `E2E_ADMIN_PASSWORD`                     | `admin@example.com` / — | Super Administrator (`SEED_ADMIN_*`).                     |
| `E2E_DEMO_PASSWORD`                                          | —                       | Password of the seeded demo users (`SEED_DEMO_PASSWORD`). |
| `E2E_EDITOR_EMAIL`, `E2E_VIEWER_EMAIL`, `E2E_PROJECTS_EMAIL` | seeded demo users       | Other roles.                                              |

Run against a **test database** seeded with sample data (`SEED_SAMPLE_DATA=true`),
never production: the tests create, publish and delete content and submit forms.

## Notes

- Public forms accept at most 5 submissions per IP per 10 minutes. Repeated
  runs may hit that limit; clear it with `DELETE FROM rate_limits;` on the test
  database.
- Forms wait 3.5 s before submitting, because submissions faster than a person
  could type are treated as spam.
- Projects: `desktop` runs everything; `mobile` (Pixel 7) runs the public site
  and form tests.
