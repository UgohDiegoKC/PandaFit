/**
 * Seeds a demo account with a plan and ~6 weeks of realistic history.
 *   npm run db:seed   →  demo@pandafit.app / pandafit123
 */
import { eq } from "drizzle-orm";
import { db, schema } from "../src/db";
import { hashPassword } from "../src/lib/password";
import { generateFallbackPlan } from "../src/lib/plan/fallback";
import { applySafety } from "../src/lib/plan/safety";
import { getActivePlan, profileToPlannerInput, savePlan } from "../src/lib/plan/service";
import { detectPRs, DAY_MS, type ExistingPr } from "../src/lib/progress";
import { addDays, zonedToUtc } from "../src/lib/tz";

const EMAIL = "demo@pandafit.app";
const COACH = "coach@pandafit.app";

async function main() {
  await db.delete(schema.users).where(eq(schema.users.email, EMAIL));
  await db.delete(schema.users).where(eq(schema.users.email, COACH));
  const [user] = await db.insert(schema.users).values({
    email: EMAIL, name: "Diego Demo", passwordHash: await hashPassword("pandafit123"), themePreference: "dark", onboardedAt: new Date(),
    isPro: true, role: "admin",
  }).returning();
  await db.insert(schema.notificationPrefs).values({ userId: user.id, timezone: "Africa/Lagos" });

  // A coach with weekday-evening availability for the next 4 weeks.
  const [coach] = await db.insert(schema.users).values({
    email: COACH, name: "Amaka Coach", passwordHash: await hashPassword("pandafit123"), role: "coach",
  }).returning();
  await db.insert(schema.notificationPrefs).values({ userId: coach.id, timezone: "Africa/Lagos" });
  const today = new Date().toISOString().slice(0, 10);
  for (let d = 1; d <= 28; d++) {
    const date = addDays(today, d);
    const wd = new Date(date + "T12:00:00Z").getUTCDay();
    if (wd === 0) continue;
    for (const min of [7 * 60, 18 * 60, 18 * 60 + 30, 19 * 60]) {
      await db.insert(schema.coachSlots).values({ coachId: coach.id, startsAt: zonedToUtc(date, min, "Africa/Lagos"), durationMin: 30 });
    }
  }

  const [profile] = await db.insert(schema.profiles).values({
    userId: user.id, age: 29, sex: "male", weightKg: 78, heightCm: 178, goal: "build_muscle", experience: "intermediate",
    gymDays: [1, 3, 5], sessionMinutes: 60, limitations: null, healthConsentAt: new Date(),
  }).returning();

  const input = profileToPlannerInput(profile);
  await savePlan(user.id, applySafety(generateFallbackPlan(input), input), { source: "fallback", model: null });
  const plan = (await getActivePlan(user.id))!;

  // Six weeks of sessions on the plan's weekdays, with gentle progressive overload.
  const prs: ExistingPr[] = [];
  const now = new Date();
  for (let w = 6; w >= 0; w--) {
    for (const day of plan.days) {
      const date = new Date(now.getTime() - w * 7 * DAY_MS);
      date.setUTCDate(date.getUTCDate() - ((date.getUTCDay() - day.weekday + 7) % 7));
      date.setUTCHours(18, 0, 0, 0);
      if (date > now || (w === 3 && day.position === 2)) continue; // one skipped session for realism
      const [session] = await db.insert(schema.workoutSessions).values({
        userId: user.id, planDayId: day.id, title: day.title, startedAt: date, completedAt: new Date(date.getTime() + 55 * 60_000), durationSec: 55 * 60,
      }).returning();
      const sets = day.exercises.flatMap((e) => {
        const baseKg = e.exerciseSlug.includes("press") || e.exerciseSlug.includes("bench") ? 22 : e.exerciseSlug.includes("squat") || e.exerciseSlug.includes("leg") ? 40 : 15;
        const kg = Math.round((baseKg + (6 - w) * 1.25) * 4) / 4;
        return Array.from({ length: e.sets }, (_, i) => ({ sessionId: session.id, exerciseSlug: e.exerciseSlug, setNumber: i + 1, weightKg: ["plank", "dead-bug", "bike-intervals", "rower-intervals"].includes(e.exerciseSlug) ? 0 : kg, reps: e.repsMax - (i > 1 ? 1 : 0), completed: true }));
      });
      await db.insert(schema.setLogs).values(sets);
      const { records, baselines } = detectPRs(sets, prs);
      for (const r of [...records, ...baselines]) {
        const i = prs.findIndex((p) => p.exerciseSlug === r.exerciseSlug && p.kind === r.kind);
        if (i >= 0) prs[i].value = r.value; else prs.push({ exerciseSlug: r.exerciseSlug, kind: r.kind, value: r.value });
        await db.insert(schema.personalRecords).values({ userId: user.id, exerciseSlug: r.exerciseSlug, kind: r.kind, value: r.value, weightKg: r.weightKg, reps: r.reps, sessionId: session.id, achievedAt: date })
          .onConflictDoUpdate({ target: [schema.personalRecords.userId, schema.personalRecords.exerciseSlug, schema.personalRecords.kind], set: { value: r.value, weightKg: r.weightKg, reps: r.reps, sessionId: session.id, achievedAt: date } });
      }
    }
  }
  console.log(`Seeded ${EMAIL} (admin + Pro) and ${COACH} (coach) — password: pandafit123`);
}

main().then(() => process.exit(0), (e) => { console.error(e); process.exit(1); });
