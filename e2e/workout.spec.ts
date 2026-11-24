import { expect, test } from "@playwright/test";
import { signIn } from "./helpers";

test("log a workout, beat a record, see it celebrated and in history", async ({ page }) => {
  await signIn(page);
  await page.goto("/app/plan");
  await page.locator("a[href^='/app/plan/day/']").first().click();
  await page.getByRole("button", { name: "Start workout" }).click();
  await expect(page).toHaveURL(/\/app\/workout\//);

  await page.getByRole("button", { name: "Mark set 1 done" }).click();
  await page.getByLabel(/Set 2 weight/).fill("200");
  await page.getByRole("button", { name: "Mark set 2 done" }).click();
  await expect(page.getByRole("status").filter({ hasText: "New personal record" })).toBeVisible();

  await page.getByRole("button", { name: "Finish workout" }).click();
  await expect(page).toHaveURL(/summary/);
  await expect(page.getByText(/new personal record/i).first()).toBeVisible();

  await page.goto("/app/progress");
  await expect(page.getByRole("heading", { name: "History" })).toBeVisible();
});

test("theme choice persists across reloads", async ({ page }) => {
  await signIn(page);
  await page.goto("/app/profile");
  await page.getByRole("radio", { name: "Light" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.getByRole("radio", { name: "Dark" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
});

test("take and end a break", async ({ page }) => {
  await signIn(page);
  await page.goto("/app/progress#breaks");
  const end = new Date(Date.now() + 5 * 864e5).toISOString().slice(0, 10);
  await page.getByLabel("Back on").fill(end);
  await page.getByRole("button", { name: "Take a break" }).click();
  await expect(page.getByText(`On a break until ${end}`)).toBeVisible();
  await page.getByRole("button", { name: /end break/ }).click();
  await expect(page.getByRole("button", { name: "Take a break" })).toBeVisible();
});
