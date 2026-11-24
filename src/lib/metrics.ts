import "server-only";
import { and, count, countDistinct, desc, eq, gte, isNotNull, sql } from "drizzle-orm";
import { db, schema } from "@/db";

/** Product metrics for the admin dashboard. Definitions: docs/ANALYTICS.md */
export async function productMetrics(days = 30, now = new Date()) {
  const since = new Date(now.getTime() - days * 864e5);
  const week = new Date(now.getTime() - 7 * 864e5);

  const cohort = await db.select({ id: schema.users.id, createdAt: schema.users.createdAt, onboardedAt: schema.users.onboardedAt })
    .from(schema.users).where(gte(schema.users.createdAt, since));
  const ids = new Set(cohort.map((u) => u.id));

  const firstWorkouts = await db.select({ userId: schema.workoutSessions.userId, first: sql<number>`min(${schema.workoutSessions.completedAt})` })
    .from(schema.workoutSessions).where(isNotNull(schema.workoutSessions.completedAt)).groupBy(schema.workoutSessions.userId);
  const firstByUser = new Map(firstWorkouts.map((f) => [f.userId, Number(f.first)]));
  const withPlan = new Set((await db.selectDistinct({ userId: schema.plans.userId }).from(schema.plans)).map((p) => p.userId));

  const signups = cohort.length;
  const onboarded = cohort.filter((u) => u.onboardedAt).length;
  const planned = cohort.filter((u) => withPlan.has(u.id)).length;
  const firstWorkout = cohort.filter((u) => firstByUser.has(u.id)).length;
  const activated = cohort.filter((u) => {
    const f = firstByUser.get(u.id);
    return f !== undefined && f - u.createdAt.getTime() <= 7 * 864e5;
  }).length;

  const [started] = await db.select({ n: count() }).from(schema.workoutSessions).where(gte(schema.workoutSessions.startedAt, since));
  const [completed] = await db.select({ n: count() }).from(schema.workoutSessions).where(and(gte(schema.workoutSessions.startedAt, since), isNotNull(schema.workoutSessions.completedAt)));
  const [wau] = await db.select({ n: countDistinct(schema.workoutSessions.userId) }).from(schema.workoutSessions).where(gte(schema.workoutSessions.completedAt, week));

  const ai = await db.select({ outcome: schema.aiGenerations.outcome, n: count(), avgMs: sql<number>`avg(${schema.aiGenerations.latencyMs})` })
    .from(schema.aiGenerations).where(gte(schema.aiGenerations.createdAt, since)).groupBy(schema.aiGenerations.outcome);
  const notif = await db.select({ status: schema.notifications.status, n: count() }).from(schema.notifications).where(gte(schema.notifications.createdAt, week)).groupBy(schema.notifications.status);
  const events = await db.select({ name: schema.events.name, n: count() }).from(schema.events).where(gte(schema.events.createdAt, since)).groupBy(schema.events.name).orderBy(desc(count()));
  const [pro] = await db.select({ n: count() }).from(schema.users).where(eq(schema.users.isPro, true));
  const [bookings] = await db.select({ n: count() }).from(schema.proBookings).where(and(eq(schema.proBookings.status, "confirmed"), gte(schema.proBookings.createdAt, since)));

  return {
    days, cohortSize: ids.size,
    funnel: [
      { step: "Signed up", n: signups },
      { step: "Finished onboarding", n: onboarded },
      { step: "Has a plan", n: planned },
      { step: "Completed a workout", n: firstWorkout },
      { step: "Activated (workout ≤7 days)", n: activated },
    ],
    workoutCompletionRate: started.n ? completed.n / started.n : null,
    workoutsStarted: started.n, workoutsCompleted: completed.n, weeklyActive: wau.n,
    ai, notifications: notif, events, proUsers: pro.n, bookingsCreated: bookings.n,
  };
}
