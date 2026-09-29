import { expect, signIn, test, users } from "./fixtures";

test.describe("authentication", () => {
  test("rejects a wrong password without saying which part was wrong", async ({ page }) => {
    await page.goto("/admin/login");
    await page.getByLabel("Email").fill(users.admin.email);
    await page.getByLabel("Password", { exact: true }).fill("definitely-not-the-password");
    await page.getByRole("button", { name: /^sign in$/i }).click();
    await expect(page.getByRole("alert")).toContainText("Email or password is incorrect.");
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
});
