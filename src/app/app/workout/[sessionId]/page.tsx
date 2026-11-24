import { notFound, redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireUser } from "@/lib/auth";
import { getActivePlan } from "@/lib/plan/service";
import { getExercise, isTimed } from "@/lib/catalog";
import { getLastPerformance, getMonthBest, getPRs } from "@/lib/queries";
import { Logger, type LoggerExercise } from "./logger";

export const metadata = { title: "Workout" };

export default async function WorkoutPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const user = await requireUser();
  const { sessionId } = await params;
  const session = await db.query.workoutSessions.findFirst({ where: and(eq(schema.workoutSessions.id, sessionId), eq(schema.workoutSessions.userId, user.id)) });
  if (!session) notFound();
  if (session.completedAt) redirect(`/app/workout/${session.id}/summary`);

  const plan = await getActivePlan(user.id);
  const day = plan?.days.find((d) => d.id === session.planDayId);
  if (!day) notFound();

  const slugs = day.exercises.map((e) => e.exerciseSlug);
  const [last, monthBest, prs, logged] = await Promise.all([
    getLastPerformance(user.id, slugs),
    getMonthBest(user.id, slugs),
    getPRs(user.id, slugs),
    db.select().from(schema.setLogs).where(eq(schema.setLogs.sessionId, session.id)),
  ]);

  const exercises: LoggerExercise[] = day.exercises.map((e) => {
    const lp = last.get(e.exerciseSlug);
    const saved = logged.filter((l) => l.exerciseSlug === e.exerciseSlug).sort((a, b) => a.setNumber - b.setNumber);
    const maxWeightPr = prs.find((p) => p.exerciseSlug === e.exerciseSlug && p.kind === "max_weight");
    return {
      slug: e.exerciseSlug,
      name: getExercise(e.exerciseSlug)?.name ?? e.exerciseSlug,
      timed: isTimed(e.exerciseSlug),
      targetSets: e.sets,
      repsMin: e.repsMin,
      repsMax: e.repsMax,
      restSec: e.restSec,
      guidance: e.weightGuidance,
      last: lp ? { weightKg: lp.weightKg, reps: lp.reps, sets: lp.sets } : null,
      monthBest: monthBest.get(e.exerciseSlug) ?? null,
      prWeightKg: maxWeightPr?.value ?? null,
      sets: saved.length
        ? saved.map((s) => ({ weightKg: s.weightKg, reps: s.reps, completed: s.completed }))
        : Array.from({ length: e.sets }, () => ({ weightKg: lp?.weightKg ?? 0, reps: lp?.reps ?? e.repsMax, completed: false })),
    };
  });

  return <Logger sessionId={session.id} title={day.title} startedAt={session.startedAt.getTime()} unit={user.unitSystem} exercises={exercises} />;
}
