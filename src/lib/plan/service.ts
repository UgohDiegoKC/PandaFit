import "server-only";
import { and, asc, eq, inArray } from "drizzle-orm";
import { db, schema } from "@/db";
import { generateAiPlan, PROMPT_VERSION } from "./ai";
import { generateFallbackPlan } from "./fallback";
import { applySafety, PlanValidationError } from "./safety";
import type { PlanDraft, PlannerInput, SafePlan } from "./types";

export function profileToPlannerInput(p: typeof schema.profiles.$inferSelect): PlannerInput {
  return {
    age: p.age, sex: p.sex, weightKg: p.weightKg, heightCm: p.heightCm, goal: p.goal,
    experience: p.experience, gymDays: p.gymDays, sessionMinutes: p.sessionMinutes, limitations: p.limitations,
  };
}

export interface GenerationResult {
  planId: string;
  source: "ai" | "fallback";
  fallbackReason?: string;
}

/**
 * Sign-up-triggered generation pipeline:
 *   AI (structured tool output) → zod validation → safety rules → save
 *   any failure ↘ rule-based fallback → safety rules → save
 */
export async function generatePlanForUser(userId: string): Promise<GenerationResult> {
  const profile = await db.query.profiles.findFirst({ where: eq(schema.profiles.userId, userId) });
  if (!profile) throw new Error("Profile not found — complete onboarding first.");
  const input = profileToPlannerInput(profile);

  const ai = await generateAiPlan(input);
  let safe: SafePlan | null = null;
  let outcome = ai.outcome;
  let error = ai.error;

  if (ai.outcome === "success" && ai.draft) {
    try {
      safe = applySafety(ai.draft, input);
    } catch (e) {
      outcome = "invalid_output";
      error = e instanceof PlanValidationError ? e.message : "Safety validation failed";
    }
  }

  await db.insert(schema.aiGenerations).values({
    userId, model: ai.model ?? null, promptVersion: PROMPT_VERSION, outcome, latencyMs: ai.latencyMs,
    inputTokens: ai.inputTokens ?? null, outputTokens: ai.outputTokens ?? null, error: error ?? null,
  });

  if (safe) {
    const planId = await savePlan(userId, safe, { source: "ai", model: ai.model ?? null });
    return { planId, source: "ai" };
  }

  const fallback = applySafety(generateFallbackPlan(input), input);
  const planId = await savePlan(userId, fallback, { source: "fallback", model: null });
  return { planId, source: "fallback", fallbackReason: outcome };
}

export async function savePlan(userId: string, plan: SafePlan, meta: { source: "ai" | "fallback" | "edited"; model: string | null }) {
  return db.transaction(async (tx) => {
    await tx.update(schema.plans).set({ status: "archived" }).where(and(eq(schema.plans.userId, userId), eq(schema.plans.status, "active")));
    const [row] = await tx.insert(schema.plans).values({
      userId, name: plan.name, summary: plan.summary, rationale: plan.rationale, source: meta.source,
      model: meta.model, promptVersion: meta.source === "ai" ? PROMPT_VERSION : null, safetyNotes: plan.safetyNotes,
    }).returning({ id: schema.plans.id });

    for (const [i, day] of plan.days.entries()) {
      const [d] = await tx.insert(schema.planDays).values({
        planId: row.id, position: i, weekday: day.weekday, title: day.title, focus: day.focus, estMinutes: day.estMinutes,
      }).returning({ id: schema.planDays.id });
      if (day.exercises.length) {
        await tx.insert(schema.planExercises).values(day.exercises.map((e, j) => ({
          dayId: d.id, position: j, exerciseSlug: e.slug, sets: e.sets, repsMin: e.repsMin, repsMax: e.repsMax,
          restSec: e.restSec, weightGuidance: e.weightGuidance, notes: e.notes ?? null,
        })));
      }
    }
    return row.id;
  });
}

export async function getActivePlan(userId: string) {
  const plan = await db.query.plans.findFirst({
    where: and(eq(schema.plans.userId, userId), eq(schema.plans.status, "active")),
    orderBy: (p, { desc }) => desc(p.createdAt),
  });
  if (!plan) return null;
  const days = await db.select().from(schema.planDays).where(eq(schema.planDays.planId, plan.id)).orderBy(asc(schema.planDays.position));
  const exercises = days.length
    ? await db.select().from(schema.planExercises).where(inArray(schema.planExercises.dayId, days.map((d) => d.id))).orderBy(asc(schema.planExercises.position))
    : [];
  return { ...plan, days: days.map((d) => ({ ...d, exercises: exercises.filter((e) => e.dayId === d.id) })) };
}

export type ActivePlan = NonNullable<Awaited<ReturnType<typeof getActivePlan>>>;

/** Rebuild a SafePlan draft from the stored plan (used when the user edits a day). */
export function storedPlanToDraft(plan: ActivePlan): PlanDraft {
  return {
    name: plan.name, summary: plan.summary, rationale: plan.rationale,
    days: plan.days.map((d) => ({
      weekday: d.weekday, title: d.title, focus: d.focus,
      exercises: d.exercises.map((e) => ({ slug: e.exerciseSlug, sets: e.sets, repsMin: e.repsMin, repsMax: e.repsMax, restSec: e.restSec, weightGuidance: e.weightGuidance, notes: e.notes })),
    })),
  };
}
