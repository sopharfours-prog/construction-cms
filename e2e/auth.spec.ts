import { expect, runId, signIn, test, useEnglishAdmin, users } from "./fixtures";

test.describe("authentication", () => {
  test("rejects a wrong password without saying which part was wrong", async ({ page }) => {
    await page.goto("/admin/login");
    await page.getByLabel("Email").fill(users.admin.email);
    await page.getByLabel("Password", { exact: true }).fill("definitely-not-the-password");
    await page.getByRole("button", { name: /^sign in$/i }).click();
    await expect(
      page.getByRole("alert").filter({ hasText: "Email or password is incorrect." }),
    ).toBeVisible();
    await expect(page).toHaveURL(/\/admin\/login/);
  });

  test("protected pages send visitors to the login page and back afterwards", async ({ page }) => {
    await page.goto("/admin/projects");
    await expect(page).toHaveURL(/\/admin\/login\?callbackUrl=%2Fadmin%2Fprojects/);
  });

  test("signs in and out; the old session no longer works", async ({ page }) => {
    await signIn(page, "admin");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await page.getByRole("button", { name: /^Account:/ }).click();
    await page.getByRole("menuitem", { name: "Sign out" }).click();
    await expect(page).toHaveURL(/\/admin\/login/);
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/admin\/login/);
  });

  test("a session revoked by an administrator lands on the login form", async ({
    page,
    browser,
    baseURL,
  }) => {
    await signIn(page, "projects");

    // An administrator sets that user's password: every session of theirs ends.
    const adminContext = await browser.newContext();
    await useEnglishAdmin(adminContext, baseURL!);
    const admin = await adminContext.newPage();
    await signIn(admin, "admin");
    await admin.goto(`/admin/users?q=${encodeURIComponent(users.projects.email)}`);
    await admin.getByRole("link", { name: /Bounmy/ }).click();
    await admin.getByLabel("Password", { exact: true }).fill(users.projects.password);
    await admin.getByLabel("Confirm password").fill(users.projects.password);
    await admin.getByRole("button", { name: "Set a new password" }).click();
    await expect(admin.getByText(/Password changed/)).toBeVisible();
    await adminContext.close();

    // The revoked browser must reach the login form (it used to redirect forever)…
    await page.goto("/admin/projects");
    await expect(page).toHaveURL(/\/admin\/login/);
    await expect(page.getByRole("button", { name: /^sign in$/i })).toBeVisible();
    // …and can sign in again.
    await signIn(page, "projects");
  });

  test("users change their own password and are signed out everywhere", async ({ page }) => {
    const { email, password } = users.projects;
    const temporary = `${password}-changed`;
    const change = async (current: string, next: string) => {
      await page.goto("/admin/account");
      await page.getByLabel("Current password").fill(current);
      await page.getByLabel("New password", { exact: true }).fill(next);
      await page.getByLabel("Confirm new password").fill(next);
      await page.getByRole("button", { name: "Change password" }).click();
    };
    const signInWith = async (value: string) => {
      await page.getByLabel("Email").fill(email);
      await page.getByLabel("Password", { exact: true }).fill(value);
      await page.getByRole("button", { name: /^sign in$/i }).click();
      await expect(page).toHaveURL(/\/admin(\/projects)?(\?.*)?$/);
    };

    await signIn(page, "projects");
    // Reachable from the account menu, without any special permission.
    await page.getByRole("button", { name: /^Account:/ }).click();
    await page.getByRole("menuitem", { name: "My profile" }).click();
    await expect(page).toHaveURL(/\/admin\/account$/);

    await change("not-my-current-password", temporary);
    await expect(page.getByText("That is not your current password.")).toBeVisible();

    await change(password, temporary);
    await expect(page).toHaveURL(/\/admin\/login/);
    await signInWith(temporary);

    // Put the seeded password back for the other tests.
    await change(temporary, password);
    await expect(page).toHaveURL(/\/admin\/login/);
    await signInWith(password);
  });

  test("a visitor requests a staff account and signs in after an administrator approves", async ({
    page,
    browser,
    baseURL,
  }) => {
    const email = `e2e-${runId}@example.com`;
    const password = `Applicant-${runId}-password`;

    // The public site's header menu leads to registration; the sign-in card has a Register tab too.
    await page.goto("/en");
    await page.getByRole("banner").getByRole("button", { name: "Log in / Register" }).click();
    await page.getByRole("menuitem", { name: "Register" }).click();
    await expect(page).toHaveURL(/\/admin\/register$/);
    await expect(page.getByRole("link", { name: "Register" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    await page.getByLabel("Full name").fill(`E2E Applicant ${runId}`);
    await page.getByLabel("Work email").fill(email);
    await page.getByLabel("Choose a password").fill(password);
    await page.getByLabel("Confirm password").fill(password);
    await page.waitForTimeout(3200); // faster than a person could type counts as automated
    await page.getByRole("button", { name: "Send request" }).click();
    await expect(page.getByRole("status")).toContainText("Request sent");

    // An administrator finds the request, picks a role and activates it.
    const adminContext = await browser.newContext();
    await useEnglishAdmin(adminContext, baseURL!);
    const admin = await adminContext.newPage();
    await signIn(admin, "admin");
    await admin.goto("/admin/users?status=PENDING");
    await admin.getByRole("link", { name: new RegExp(`E2E Applicant ${runId}`) }).click();
    await expect(
      admin.getByText(/asked for an account through the registration form/),
    ).toBeVisible();
    await admin.getByLabel("Role").selectOption({ label: "Viewer" });
    await admin.getByLabel("Account status").selectOption("ACTIVE");
    await admin.getByRole("button", { name: "Save changes" }).click();
    await expect(admin.getByText("Saved.")).toBeVisible();
    await adminContext.close();

    // Now the applicant can sign in with the password they chose.
    await page.goto("/admin/login");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password", { exact: true }).fill(password);
    await page.getByRole("button", { name: /^sign in$/i }).click();
    await expect(page).toHaveURL(/\/admin(\?.*)?$/);
  });
});
