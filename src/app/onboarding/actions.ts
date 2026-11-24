"use server";

import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireUser } from "@/lib/auth";
import { track } from "@/lib/analytics";
import { onboardingSchema } from "@/lib/plan/types";
import { toCm, toKg } from "@/lib/units";

export type OnboardingState = { fieldErrors?: Record<string, string>; error?: string } | undefined;

/** Plausibility bounds (metric) — reject obvious typos rather than feed them to the planner. */
const BOUNDS = { weightKg: [30, 300], heightCm: [120, 230] } as const;

export async function saveProfile(_: OnboardingState, form: FormData): Promise<OnboardingState> {
  const user = await requireUser({ allowUnonboarded: true });
  const raw = {
    ...Object.fromEntries(form),
    gymDays: form.getAll("gymDays"),
    healthConsent: form.get("healthConsent") === "on",
  };
  const parsed = onboardingSchema.safeParse(raw);
  if (!parsed.success) {
    const fe: Record<string, string> = {};
    for (const i of parsed.error.issues) fe[String(i.path[0])] ??= i.message;
    return { fieldErrors: fe };
  }
  const d = parsed.data;
  const weightKg = toKg(d.weight, d.unitSystem);
  const heightCm = toCm(d.height, d.unitSystem);
  if (weightKg < BOUNDS.weightKg[0] || weightKg > BOUNDS.weightKg[1]) return { fieldErrors: { weight: "That weight looks off — please double-check it and the unit." } };
  if (heightCm < BOUNDS.heightCm[0] || heightCm > BOUNDS.heightCm[1]) return { fieldErrors: { height: "That height looks off — please double-check it and the unit." } };

  const values = {
    age: d.age, sex: d.sex, weightKg, heightCm, goal: d.goal, experience: d.experience,
    gymDays: [...new Set(d.gymDays)].sort((a, b) => a - b), sessionMinutes: d.sessionMinutes,
    limitations: d.limitations?.trim() || null, healthConsentAt: new Date(), updatedAt: new Date(),
  };

  await db.insert(schema.profiles).values({ userId: user.id, ...values }).onConflictDoUpdate({ target: schema.profiles.userId, set: values });
  await db.update(schema.users).set({ unitSystem: d.unitSystem, onboardedAt: user.onboardedAt ?? new Date() }).where(eq(schema.users.id, user.id));

  await track(user.onboardedAt ? "profile_updated" : "onboarding_completed", user.id, {
    goal: d.goal, experience: d.experience, days: values.gymDays.length, minutes: d.sessionMinutes, limitations: !!values.limitations,
  });
  redirect(form.get("returnTo") === "profile" ? "/app/profile?saved=1" : "/onboarding/generating");
}
