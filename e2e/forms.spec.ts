import { expect, runId, test } from "./fixtures";

// Public forms reject submissions made faster than a person could type (3 s).
const humanPause = (ms = 3500) => new Promise((r) => setTimeout(r, ms));

test.describe("public forms", () => {
  test("contact form: client validation, then a successful message", async ({ page }) => {
    await page.goto("/en/contact");
    await page.getByRole("button", { name: "Send message" }).click();
    await expect(
      page.getByRole("alert").filter({ hasText: "Please correct the highlighted fields." }),
    ).toBeVisible();
    await expect(page.getByLabel(/Full name/)).toBeFocused();

    await page.getByLabel(/Full name/).fill(`E2E Visitor ${runId}`);
    await page.getByLabel(/^Email/).fill(`e2e-${runId}@example.com`);
    await page.getByLabel(/^Subject/).fill("Office renovation");
    await page
      .getByLabel(/^Message/)
      .fill("We would like a site visit next week to discuss a renovation.");
    await humanPause();
    await page.getByRole("button", { name: "Send message" }).click();
    await expect(page.getByRole("status")).toContainText("Thank you");
  });

  test("quote request returns a reference number", async ({ page }) => {
    await page.goto("/en/request-quote");
    await page.getByLabel(/Name or company contact/).fill(`E2E Customer ${runId}`);
    await page.getByLabel(/^Email/).fill(`e2e-quote-${runId}@example.com`);
    await page.getByLabel(/^Phone/).fill("+856 20 5555 1234");
    await page.getByLabel(/^Project type/).fill("Warehouse");
    await page.getByLabel(/^Project location/).fill("Savannakhet");
    await page
      .getByLabel(/^Project description/)
      .fill("Steel-frame warehouse of about 3,000 m² with an office annex.");
    await humanPause();
    await page.getByRole("button", { name: "Send request" }).click();
    await expect(page.getByRole("status")).toContainText(/Q-\d{4}-\d{6}/);
  });

  test("rejects files that are not documents or images", async ({ page }) => {
    await page.goto("/en/contact");
    await page.locator('input[type="file"]').setInputFiles({
      name: "run-me.exe",
      mimeType: "application/octet-stream",
      buffer: Buffer.from("MZ"),
    });
    await expect(
      page.getByText("Only PDF, JPG, PNG and DOCX files can be attached."),
    ).toBeVisible();
  });
});
