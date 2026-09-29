import { expect, signIn, test } from "./fixtures";

test.describe("role-based access", () => {
  test("viewer sees projects but cannot create or edit", async ({ page }) => {
    await signIn(page, "viewer");
    await page.goto("/admin/projects");
    await expect(page.getByRole("heading", { name: "Projects", level: 1 })).toBeVisible();
    await expect(page.getByRole("link", { name: "New project" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: /^Actions:/ })).toHaveCount(0);
    await page.goto("/admin/projects/new");
    await expect(page).toHaveURL(/\/admin\/forbidden/);
  });

  test("content editor cannot open projects, users or settings", async ({ page }) => {
    await signIn(page, "editor");
    for (const path of [
      "/admin/projects",
      "/admin/users",
      "/admin/settings",
      "/admin/audit-logs",
    ]) {
      await page.goto(path);
      await expect(page, path).toHaveURL(/\/admin\/forbidden/);
    }
    // Navigation only offers what the role may use.
    await page.goto("/admin");
    await expect(page.getByRole("link", { name: "News" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Users" })).toHaveCount(0);
  });

  test("the API refuses what the UI hides", async ({ page }) => {
    await signIn(page, "viewer");
    const response = await page.request.patch("/api/media/00000000-0000-7000-8000-000000000000", {
      data: { altText: "x" },
      headers: { Origin: new URL(page.url()).origin },
    });
    expect(response.status()).toBe(403);
  });
});
