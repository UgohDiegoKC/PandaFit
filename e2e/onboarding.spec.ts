import { expect, test } from "@playwright/test";
import { uniqueEmail } from "./helpers";

test("sign-up → questionnaire → safe plan generated (template fallback without API key)", async ({ page }) => {
  await page.goto("/sign-up");
  await page.getByLabel("Name").fill("Ada");
  await page.getByLabel("Email").fill(uniqueEmail());
  await page.getByLabel("Password", { exact: true }).fill("strongpass123");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/onboarding/);

  await page.getByLabel("Age").fill("34");
  await page.getByRole("radio", { name: "Female", exact: true }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByLabel(/Weight/).fill("64");
  await page.getByLabel(/Height/).fill("168");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("radio", { name: "Lose fat" }).click();
  await page.getByRole("radio", { name: /beginner/i }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("radio", { name: "30 min" }).click();
  await page.getByRole("button", { name: "Continue" }).click();

  // Reaching the last step must NOT auto-submit (regression: early submit wiped answers).
  await expect(page.getByText(/need your consent/)).toHaveCount(0);
  await page.getByLabel(/Injuries or conditions/).fill("sore lower back");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Build my plan" }).click();

  await expect(page).toHaveURL(/\/app\/plan\?new=1/, { timeout: 30_000 });
  await expect(page.getByText("Your plan is ready.")).toBeVisible();
  await expect(page.getByText(/doctor or physiotherapist/)).toBeVisible();
  await expect(page.getByText("Barbell Back Squat")).toHaveCount(0); // beginner + back issue → no high-risk barbell lifts
});

test("rejects under-18s during onboarding", async ({ page }) => {
  await page.goto("/sign-up");
  await page.getByLabel("Name").fill("Teen");
  await page.getByLabel("Email").fill(uniqueEmail("teen"));
  await page.getByLabel("Password", { exact: true }).fill("strongpass123");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Create account" }).click();
  await page.getByLabel("Age").fill("16");
  await page.getByRole("radio", { name: "Male", exact: true }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { name: "About you" })).toBeVisible(); // blocked by validation
});
