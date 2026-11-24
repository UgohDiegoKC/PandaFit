import { expect, test } from "@playwright/test";
import { COACH, signIn } from "./helpers";

test("Pro member books, reschedules and cancels check-ins; coach sees the booking", async ({ page, browser }) => {
  await signIn(page);
  await page.goto("/app/coach");
  await page.getByRole("radio", { name: "Every 2 weeks" }).click();
  await page.getByRole("radiogroup", { name: "Time" }).getByRole("radio").first().click();
  await page.getByRole("button", { name: "Book check-ins" }).click();
  await expect(page.getByRole("status")).toContainText(/Booked \d check-in/);
  await expect(page.getByRole("heading", { name: "Upcoming" })).toBeVisible();

  // Coach view
  const coachCtx = await browser.newContext();
  const coachPage = await coachCtx.newPage();
  await signIn(coachPage, COACH);
  await coachPage.goto("/coach");
  await expect(coachPage.getByText(/Diego · biweekly/).first()).toBeVisible();
  await coachCtx.close();

  // Reschedule the first one
  await page.getByRole("button", { name: "Reschedule" }).first().click();
  await page.getByRole("radiogroup", { name: "Time" }).getByRole("radio").first().click();
  await page.getByRole("button", { name: "Move check-in" }).click();
  await expect(page.getByRole("status")).toContainText("Check-in moved");

  page.on("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Cancel all upcoming" }).click();
  await expect(page.getByRole("status")).toContainText(/Cancelled \d/);
});

test("admin can toggle Pro and sees the funnel and outbox", async ({ page }) => {
  await signIn(page);
  await page.goto("/admin");
  await expect(page.getByRole("heading", { name: /Activation funnel/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Recent emails" })).toBeVisible();
  const toggle = page.getByLabel("Pro for Amaka Coach");
  await toggle.check();
  await page.reload();
  await expect(page.getByLabel("Pro for Amaka Coach")).toBeChecked();
});

test("coaches without admin role can't open the admin page", async ({ page }) => {
  await signIn(page, COACH);
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/app|\/onboarding/);
});

test("reminder cron endpoint rejects bad secrets and runs with the right one", async ({ request }) => {
  expect((await request.post("/api/cron/reminders")).status()).toBe(401);
  const ok = await request.post("/api/cron/reminders", { headers: { authorization: "Bearer e2e-cron" } });
  expect(ok.status()).toBe(200);
  expect(await ok.json()).toHaveProperty("scheduled");
});
