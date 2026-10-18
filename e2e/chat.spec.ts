import { expect, runId, signIn, test, useEnglishAdmin } from "./fixtures";

test.describe("live chat", () => {
  test("a visitor chats with staff, and both see each other's messages", async ({
    page,
    browser,
    baseURL,
  }) => {
    test.setTimeout(90_000);
    const name = `E2E Visitor ${runId}`;

    // Visitor starts a chat from the bubble.
    await page.goto("/en");
    await page.getByRole("button", { name: "Chat with us" }).click();
    const chat = page.getByRole("dialog", { name: "Chat with us" });
    await expect(chat.getByLabel("Your name")).toBeFocused();
    await chat.getByRole("button", { name: "Start chat" }).click();
    await expect(chat.getByText("This field is required.").first()).toBeVisible();
    await chat.getByLabel("Your name").fill(name);
    await chat.getByLabel("Email or phone").fill("020 5555 1234");
    await chat.getByLabel("Message").fill(`Hello from ${runId}`);
    await chat.getByRole("button", { name: "Start chat" }).click();
    await expect(chat.getByText(`Hello from ${runId}`)).toBeVisible({ timeout: 15_000 });

    // Staff find it in the inbox and reply.
    const staffContext = await browser.newContext();
    await useEnglishAdmin(staffContext, baseURL!);
    const staff = await staffContext.newPage();
    await signIn(staff, "admin");
    await staff.goto("/admin/chats");
    // Each row has a Reply button named after the visitor.
    await staff.getByRole("link", { name: new RegExp(`Reply: ${name}`) }).click();
    await expect(staff).toHaveURL(/\/admin\/chats\/[0-9a-f-]{36}$/);
    await expect(staff.getByText(`Hello from ${runId}`)).toBeVisible();
    await staff.getByLabel("Reply", { exact: true }).fill(`Staff answer ${runId}`);
    await staff.getByRole("button", { name: "Send" }).click();
    await expect(staff.getByText(`Staff answer ${runId}`)).toBeVisible();

    // The visitor receives it without reloading, and answers back.
    await expect(chat.getByText(`Staff answer ${runId}`)).toBeVisible({ timeout: 15_000 });
    await chat.getByLabel("Message").fill(`Thanks ${runId}`);
    await chat.getByLabel("Message").press("Enter");
    await expect(staff.getByText(`Thanks ${runId}`)).toBeVisible({ timeout: 15_000 });

    // Escape closes the window and returns focus to the bubble.
    await page.keyboard.press("Escape");
    await expect(chat).toBeHidden();
    await expect(page.getByRole("button", { name: /Chat with us/ })).toBeFocused();

    // Clean up: delete the conversation.
    await staff.getByRole("button", { name: "Delete" }).click();
    await staff.getByRole("alertdialog").getByRole("button", { name: "Delete" }).click();
    await expect(staff).toHaveURL(/\/admin\/chats$/);
    await staffContext.close();
  });
});
