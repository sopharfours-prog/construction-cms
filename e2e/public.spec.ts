import { expect, test } from "./fixtures";

test.describe("public website", () => {
  test("the root redirects to a language and every main page renders", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/(lo|en)$/);
    for (const path of [
      "/en",
      "/en/about",
      "/en/services",
      "/en/projects",
      "/en/news",
      "/en/contact",
      "/en/request-quote",
    ]) {
      const response = await page.goto(path);
      expect(response?.status(), path).toBe(200);
      await expect(page.getByRole("heading", { level: 1 }), path).toBeVisible();
      await expect(page.locator("html"), path).toHaveAttribute("lang", "en");
    }
  });

  test("switches language and keeps the page", async ({ page, isMobile }) => {
    await page.goto("/lo/projects");
    if (isMobile) await page.getByRole("button", { name: "ເປີດເມນູ" }).click();
    await page
      .getByRole("link", { name: /Read this page in English/ })
      .first()
      .click();
    await expect(page).toHaveURL(/\/en\/projects$/);
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
  });

  test("filters projects through the URL", async ({ page }) => {
    await page.goto("/en/projects");
    await page.getByLabel("Status").selectOption("COMPLETED");
    await page.getByRole("button", { name: "Apply" }).click();
    await expect(page).toHaveURL(/status=COMPLETED/);
    await expect(page.getByText(/\d+ projects/)).toBeVisible();
  });

  test("navigation works on small screens", async ({ page, isMobile }) => {
    test.skip(!isMobile, "mobile menu only");
    await page.goto("/en");
    await page.getByRole("button", { name: "Open menu" }).click();
    await page.getByRole("dialog").getByRole("link", { name: "Projects" }).click();
    await expect(page).toHaveURL(/\/en\/projects$/);
    // No horizontal scrolling on a phone.
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow).toBeLessThanOrEqual(1);
  });

  test("unknown pages return a real 404 in the right language", async ({ page }) => {
    const response = await page.goto("/en/projects/does-not-exist");
    expect(response?.status()).toBe(404);
    await expect(page.getByText("Page not found")).toBeVisible();
  });
});
