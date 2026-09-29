import { type BrowserContext, expect, type Page, test as base } from "@playwright/test";

export const users = {
  admin: {
    email: process.env.E2E_ADMIN_EMAIL ?? "admin@example.com",
    password: process.env.E2E_ADMIN_PASSWORD ?? "",
  },
  editor: {
    email: process.env.E2E_EDITOR_EMAIL ?? "editor@example.com",
    password: process.env.E2E_DEMO_PASSWORD ?? "",
  },
  viewer: {
    email: process.env.E2E_VIEWER_EMAIL ?? "viewer@example.com",
    password: process.env.E2E_DEMO_PASSWORD ?? "",
  },
  projects: {
    email: process.env.E2E_PROJECTS_EMAIL ?? "projects@example.com",
    password: process.env.E2E_DEMO_PASSWORD ?? "",
  },
};
export type Role = keyof typeof users;

/** Unique suffix so repeated runs never collide on slugs or emails. */
export const runId = `${Date.now().toString(36)}${Math.floor(Math.random() * 1000)}`;

/** English CMS labels keep selectors stable. */
export async function useEnglishAdmin(context: BrowserContext, baseURL: string) {
  await context.addCookies([{ name: "admin_locale", value: "en", url: baseURL }]);
}

export async function signIn(page: Page, role: Role) {
  const { email, password } = users[role];
  if (!password) throw new Error(`Set the password for "${role}" (see e2e/README.md)`);
  await page.goto("/admin/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: /^sign in$/i }).click();
  await expect(page).toHaveURL(/\/admin(\?.*)?$/);
}

/**
 * Every test fails on a Content-Security-Policy violation, an uncaught page
 * error or a console error: the checks that can't be made without a browser.
 */
export const test = base.extend<{ browserErrors: string[] }>({
  browserErrors: [
    async ({ page, context, baseURL }, use) => {
      await useEnglishAdmin(context, baseURL!);
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));
      page.on("console", (message) => {
        const text = message.text();
        if (
          message.type() === "error" ||
          /Content Security Policy|Refused to (execute|load|connect|frame)/i.test(text)
        ) {
          // Expected failures the tests trigger on purpose (4xx from fetch) are filtered by the tests themselves.
          if (!/Failed to load resource: the server responded with a status of 4\d\d/.test(text))
            errors.push(`console: ${text}`);
        }
      });
      await use(errors);
      expect(errors, "browser errors / CSP violations").toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };
