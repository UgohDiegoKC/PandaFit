import "server-only";
import { and, desc, eq, gte, inArray, isNotNull } from "drizzle-orm";
import { db, schema } from "@/db";
import { activityGrid, activeBreak, sessionVolume, weeklyStreak, DAY_MS } from "./progress";

export async function getCompletedSessions(userId: string, limit?: number) {
  const q = db.select().from(schema.workoutSessions)
    .where(and(eq(schema.workoutSessions.userId, userId), isNotNull(schema.workoutSessions.completedAt)))
    .orderBy(desc(schema.workoutSessions.completedAt));
  return limit ? q.limit(limit) : q;
}

export async function getSetsForSessions(sessionIds: string[]) {
  if (!sessionIds.length) return [];
  return db.select().from(schema.setLogs).where(inArray(schema.setLogs.sessionId, sessionIds));
}

export async function getBreaks(userId: string) {
  return db.select().from(schema.breaks).where(eq(schema.breaks.userId, userId)).orderBy(desc(schema.breaks.startsOn));
}

export async function getProgressSummary(userId: string) {
  const [sessions, breaks] = await Promise.all([getCompletedSessions(userId), getBreaks(userId)]);
  const dates = sessions.map((s) => s.completedAt!);
  const weekAgo = new Date(Date.now() - 7 * DAY_MS);
  const recentIds = sessions.filter((s) => s.completedAt! >= weekAgo).map((s) => s.id);
  const recentSets = await getSetsForSessions(recentIds);
  return {
    sessions,
    breaks,
    streak: weeklyStreak(dates, breaks),
    onBreak: activeBreak(breaks),
    grid: activityGrid(dates),
    volume7d: sessionVolume(recentSets),
    workouts7d: recentIds.length,
  };
}

/** Last completed performance per exercise ("Last time" in the logger). */
export async function getLastPerformance(userId: string, slugs: string[]) {
  if (!slugs.length) return new Map<string, { weightKg: number; reps: number; sets: number }>();
  const rows = await db
    .select({ slug: schema.setLogs.exerciseSlug, weightKg: schema.setLogs.weightKg, reps: schema.setLogs.reps, sessionId: schema.setLogs.sessionId, completedAt: schema.workoutSessions.completedAt })
    .from(schema.setLogs)
    .innerJoin(schema.workoutSessions, eq(schema.setLogs.sessionId, schema.workoutSessions.id))
    .where(and(eq(schema.workoutSessions.userId, userId), isNotNull(schema.workoutSessions.completedAt), inArray(schema.setLogs.exerciseSlug, slugs), eq(schema.setLogs.completed, true)))
    .orderBy(desc(schema.workoutSessions.completedAt));

  const out = new Map<string, { weightKg: number; reps: number; sets: number; sessionId: string }>();
  for (const r of rows) {
    const cur = out.get(r.slug);
    if (!cur) out.set(r.slug, { weightKg: r.weightKg, reps: r.reps, sets: 1, sessionId: r.sessionId });
    else if (cur.sessionId === r.sessionId) {
      cur.sets++;
      if (r.weightKg > cur.weightKg) Object.assign(cur, { weightKg: r.weightKg, reps: r.reps });
    }
  }
  return out;
}

export async function getPRs(userId: string, slugs?: string[]) {
  return db.select().from(schema.personalRecords).where(
    slugs ? and(eq(schema.personalRecords.userId, userId), inArray(schema.personalRecords.exerciseSlug, slugs)) : eq(schema.personalRecords.userId, userId),
  ).orderBy(desc(schema.personalRecords.achievedAt));
}

/** Best weight per exercise in the last 30 days ("Best · month"). */
export async function getMonthBest(userId: string, slugs: string[]) {
  if (!slugs.length) return new Map<string, { weightKg: number; reps: number }>();
  const rows = await db
    .select({ slug: schema.setLogs.exerciseSlug, weightKg: schema.setLogs.weightKg, reps: schema.setLogs.reps })
    .from(schema.setLogs)
    .innerJoin(schema.workoutSessions, eq(schema.setLogs.sessionId, schema.workoutSessions.id))
    .where(and(eq(schema.workoutSessions.userId, userId), gte(schema.workoutSessions.startedAt, new Date(Date.now() - 30 * DAY_MS)), inArray(schema.setLogs.exerciseSlug, slugs), eq(schema.setLogs.completed, true)));
  const out = new Map<string, { weightKg: number; reps: number }>();
  for (const r of rows) {
    const cur = out.get(r.slug);
    if (!cur || r.weightKg > cur.weightKg || (r.weightKg === cur.weightKg && r.reps > cur.reps)) out.set(r.slug, { weightKg: r.weightKg, reps: r.reps });
  }
  return out;
}
