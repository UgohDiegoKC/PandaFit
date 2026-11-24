import { expect, type Page } from "@playwright/test";

export const DEMO = { email: "demo@pandafit.app", password: "pandafit123" };
export const COACH = { email: "coach@pandafit.app", password: "pandafit123" };

export async function signIn(page: Page, who = DEMO) {
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill(who.email);
  await page.getByLabel("Password", { exact: true }).fill(who.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).not.toHaveURL(/sign-in/);
}

export const uniqueEmail = (p = "e2e") => `${p}-${Date.now()}-${Math.floor(Math.random() * 1e4)}@example.com`;
