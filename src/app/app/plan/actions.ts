"use server";

import { redirect } from "next/navigation";
import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/db";
import { requireUser } from "@/lib/auth";
import { track } from "@/lib/analytics";
import { applySafety, PlanValidationError } from "@/lib/plan/safety";
import { getActivePlan, profileToPlannerInput, savePlan, storedPlanToDraft } from "@/lib/plan/service";
import { planExerciseSchema } from "@/lib/plan/types";

async function ownedDay(userId: string, dayId: string) {
  const plan = await getActivePlan(userId);
  const day = plan?.days.find((d) => d.id === dayId);
  if (!plan || !day) throw new Error("Workout not found");
  return { plan, day };
}

export async function startWorkout(dayId: string) {
  const user = await requireUser();
  const { day } = await ownedDay(user.id, dayId);
  // Resume an unfinished session for this day instead of creating duplicates.
  const open = await db.query.workoutSessions.findFirst({
    where: and(eq(schema.workoutSessions.userId, user.id), eq(schema.workoutSessions.planDayId, dayId), isNull(schema.workoutSessions.completedAt)),
  });
  const id = open?.id ?? (await db.insert(schema.workoutSessions).values({ userId: user.id, planDayId: day.id, title: day.title, startedAt: new Date() }).returning())[0].id;
  await track("workout_started", user.id, { resumed: !!open });
  redirect(`/app/workout/${id}`);
}

const editSchema = z.object({
  title: z.string().trim().min(1).max(60),
  exercises: z.array(planExerciseSchema).min(2, "Keep at least 2 exercises.").max(8, "Keep it to 8 exercises or fewer."),
});

export async function saveDayEdits(dayId: string, payload: unknown): Promise<{ error?: string }> {
  const user = await requireUser();
  const parsed = editSchema.safeParse(payload);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { plan, day } = await ownedDay(user.id, dayId);
  const profile = await db.query.profiles.findFirst({ where: eq(schema.profiles.userId, user.id) });
  if (!profile) return { error: "Profile missing" };

  const draft = storedPlanToDraft(plan);
  draft.days[day.position] = { ...draft.days[day.position], title: parsed.data.title, exercises: parsed.data.exercises };
  let safe;
  try {
    safe = applySafety(draft, profileToPlannerInput(profile));
  } catch (e) {
    return { error: e instanceof PlanValidationError ? e.message : "Couldn't save those changes." };
  }
  await savePlan(user.id, safe, { source: "edited", model: plan.model });
  await track("plan_edited", user.id, { exercises: parsed.data.exercises.length });
  const fresh = await getActivePlan(user.id);
  redirect(`/app/plan/day/${fresh!.days[day.position].id}?saved=1`);
}
