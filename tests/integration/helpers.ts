import { db, schema } from "@/db";
import { applySafety } from "@/lib/plan/safety";
import { generateFallbackPlan } from "@/lib/plan/fallback";
import { profileToPlannerInput, savePlan } from "@/lib/plan/service";

export async function resetDb() {
  for (const t of [schema.notifications, schema.emailOutbox, schema.events, schema.proBookings, schema.coachSlots, schema.users]) await db.delete(t);
}

let n = 0;
export async function makeUser(o: { gymDays?: number[]; isPro?: boolean; role?: "user" | "coach" | "admin"; tz?: string } = {}) {
  const [u] = await db.insert(schema.users).values({
    email: `u${++n}-${Date.now()}@test.local`, name: `User ${n}`, passwordHash: "x", onboardedAt: new Date(), isPro: o.isPro ?? false, role: o.role ?? "user",
  }).returning();
  await db.insert(schema.notificationPrefs).values({ userId: u.id, timezone: o.tz ?? "Africa/Lagos" });
  if (o.gymDays) {
    const [p] = await db.insert(schema.profiles).values({
      userId: u.id, age: 30, sex: "female", weightKg: 65, heightCm: 168, goal: "general_fitness", experience: "beginner",
      gymDays: o.gymDays, sessionMinutes: 45, healthConsentAt: new Date(),
    }).returning();
    const input = profileToPlannerInput(p);
    await savePlan(u.id, applySafety(generateFallbackPlan(input), input), { source: "fallback", model: null });
  }
  return u.id;
}
