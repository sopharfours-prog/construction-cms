import { expect, runId, signIn, test } from "./fixtures";

const slug = `e2e-project-${runId}`;
const title = `E2E ໂຄງການ ${runId}`;

test.describe.serial("project management", () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page, "admin");
  });

  test("creates a draft project that is not public", async ({ page }) => {
    await page.goto("/admin/projects/new");
    await page.locator('input[name="translations.lo.title"]').fill(title);
    await page
      .locator('textarea[name="translations.lo.shortDescription"]')
      .fill("Created by the end-to-end test.");
    await page.getByLabel("URL slug").fill(slug);
    await page.getByLabel("Construction stage").selectOption("ONGOING");
    await page.getByRole("button", { name: "Create" }).click();
    await expect(page.getByText("Created.")).toBeVisible();
    await expect(page).toHaveURL(/\/admin\/projects\/[0-9a-f-]{36}$/);

    const response = await page.request.get(`/en/projects/${slug}`);
    expect(response.status()).toBe(404);
  });

  test("validates on the client and the server", async ({ page }) => {
    await page.goto("/admin/projects/new");
    await page.getByLabel("URL slug").fill(slug); // taken by the previous test
    await page.getByRole("button", { name: "Create" }).click();
    await expect(page.getByText("Required.").first()).toBeVisible();
    await page.locator('input[name="translations.lo.title"]').fill("Duplicate slug");
    await page.getByRole("button", { name: "Create" }).click();
    await expect(page.getByText("Another item already uses this slug.")).toBeVisible();
  });

  test("edits and publishes; the project appears on the website", async ({ page }) => {
    await page.goto(`/admin/projects?q=${encodeURIComponent(runId)}`);
    await page.getByRole("link", { name: title }).click();
    await page.locator('input[name="translations.lo.location"]').fill("ນະຄອນຫຼວງວຽງຈັນ");
    await page.getByLabel("Publication").selectOption("PUBLISHED");
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(page.getByText("Saved.")).toBeVisible();

    await page.goto(`/lo/projects/${slug}`);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(title);
    await expect(page.getByText("ນະຄອນຫຼວງວຽງຈັນ").first()).toBeVisible();
  });

  test("unpublishes and deletes; the public page is gone", async ({ page }) => {
    await page.goto(`/admin/projects?q=${encodeURIComponent(runId)}`);
    await page.getByRole("button", { name: `Actions: ${title}` }).click();
    await page.getByRole("menuitem", { name: "Unpublish" }).click();
    await expect(page.getByText("Moved to drafts.")).toBeVisible();
    expect((await page.request.get(`/lo/projects/${slug}`)).status()).toBe(404);

    await page.getByRole("button", { name: `Actions: ${title}` }).click();
    await page.getByRole("menuitem", { name: "Delete" }).click();
    await page.getByRole("alertdialog").getByRole("button", { name: "Delete" }).click();
    await expect(page.getByText("Deleted.")).toBeVisible();
    await expect(page.getByRole("link", { name: title })).toHaveCount(0);
  });
});
