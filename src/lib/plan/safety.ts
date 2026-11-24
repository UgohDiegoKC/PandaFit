/**
 * Deterministic workout-safety guardrails (Notion: "Define AI workout-generation architecture and safety guardrails").
 * Every plan — AI-generated, fallback, or user-edited — passes through applySafety() before it is saved.
 * The model proposes; these rules decide.
 */
import { CATALOG_BY_SLUG, getExercise, isTimed, type Exercise } from "../catalog";
import type { PlanDraft, PlannerInput, SafePlan, PlanExerciseDraft } from "./types";

export const LIMITS = {
  maxExercisesPerDay: 8,
  minExercisesPerDay: 2,
  sets: { min: 1, max: 5, beginnerMax: 4 },
  reps: { min: 1, max: 30 },
  timedSeconds: { min: 15, max: 90 },
  rest: { min: 30, max: 240, compoundMin: 60 },
  warmupMinutes: 5,
  durationTolerance: 1.15,
} as const;

export class PlanValidationError extends Error {}

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, Math.round(n)));

/** Seconds of work per rep — used for duration estimates. */
const SECONDS_PER_REP = 3.5;

export function estimateExerciseSeconds(e: Pick<PlanExerciseDraft, "slug" | "sets" | "repsMin" | "repsMax" | "restSec">) {
  const avgReps = (e.repsMin + e.repsMax) / 2;
  const work = isTimed(e.slug) ? avgReps : avgReps * SECONDS_PER_REP;
  // rest happens between sets, plus ~60s set-up/transition per exercise
  return e.sets * work + Math.max(0, e.sets - 1) * e.restSec + 60;
}

export function estimateDayMinutes(exercises: PlanExerciseDraft[]) {
  const secs = exercises.reduce((s, e) => s + estimateExerciseSeconds(e), 0);
  return Math.round(secs / 60 + LIMITS.warmupMinutes);
}

function needsConservative(input: PlannerInput) {
  return input.experience === "beginner" || !!input.limitations?.trim() || input.age >= 65;
}

function saferAlternative(ex: Exercise, used: Set<string>): Exercise | undefined {
  for (const s of ex.substitutions) {
    const alt = getExercise(s);
    if (alt && !alt.highRisk && !used.has(alt.slug)) return alt;
  }
  return undefined;
}

export function applySafety(draft: PlanDraft, input: PlannerInput): SafePlan {
  const notes = new Set<string>();
  const conservative = needsConservative(input);
  const gymDays = [...new Set(input.gymDays)].sort((a, b) => a - b);

  if (draft.days.length === 0) throw new PlanValidationError("Plan has no training days.");

  // Map generated days onto the user's chosen weekdays (by order). Extra days are dropped,
  // missing days are filled by repeating the plan cyclically.
  const sourceDays = [...draft.days].sort((a, b) => a.weekday - b.weekday);
  const days = gymDays.map((weekday, i) => ({ ...sourceDays[i % sourceDays.length], weekday }));
  if (draft.days.length !== gymDays.length) notes.add("Training days were matched to the gym days you picked.");

  const safeDays = days.map((day) => {
    const used = new Set<string>();
    const exercises: PlanExerciseDraft[] = [];

    for (const raw of day.exercises) {
      let ex = CATALOG_BY_SLUG.get(raw.slug);
      if (!ex) continue; // unknown / invented exercise — drop it
      if (ex.highRisk && conservative) {
        const alt = saferAlternative(ex, used);
        if (!alt) continue;
        notes.add("Some technical barbell lifts were swapped for safer alternatives based on your experience or the limitations you shared.");
        ex = alt;
      }
      if (ex.level === "advanced" && input.experience === "beginner") {
        const alt = saferAlternative(ex, used);
        if (!alt) continue;
        ex = alt;
      }
      if (used.has(ex.slug)) continue;
      used.add(ex.slug);

      const timed = isTimed(ex.slug);
      const repBounds = timed ? LIMITS.timedSeconds : LIMITS.reps;
      let repsMin = clamp(raw.repsMin, repBounds.min, repBounds.max);
      let repsMax = clamp(raw.repsMax, repBounds.min, repBounds.max);
      if (repsMin > repsMax) [repsMin, repsMax] = [repsMax, repsMin];
      if (!timed && input.age >= 65 && repsMin < 8) {
        repsMin = 8;
        repsMax = Math.max(repsMax, 12);
        notes.add("Rep ranges were kept moderate (8+ reps) to limit very heavy loading.");
      }
      if (!timed && input.experience === "beginner" && repsMin < 5) {
        repsMin = 6;
        repsMax = Math.max(repsMax, 10);
      }

      const maxSets = input.experience === "beginner" ? LIMITS.sets.beginnerMax : LIMITS.sets.max;
      const restMin = ex.compound && !timed ? LIMITS.rest.compoundMin : LIMITS.rest.min;

      exercises.push({
        slug: ex.slug,
        sets: clamp(raw.sets, LIMITS.sets.min, maxSets),
        repsMin,
        repsMax,
        restSec: clamp(raw.restSec, restMin, LIMITS.rest.max),
        weightGuidance: (raw.weightGuidance || "Choose a weight you can lift with good form, stopping 2 reps short of failure.").slice(0, 200),
        notes: raw.notes ?? null,
      });
      if (exercises.length >= LIMITS.maxExercisesPerDay) break;
    }

    // Fit the session length: drop isolation work from the end, then trim sets.
    const budget = input.sessionMinutes * LIMITS.durationTolerance;
    let guard = 0;
    while (estimateDayMinutes(exercises) > budget && guard++ < 50) {
      const lastIsolation = findLastIndex(exercises, (e) => !CATALOG_BY_SLUG.get(e.slug)!.compound);
      if (lastIsolation >= 0 && exercises.length > LIMITS.minExercisesPerDay) {
        exercises.splice(lastIsolation, 1);
        continue;
      }
      const biggest = exercises.reduce((bi, e, i) => (e.sets > exercises[bi].sets ? i : bi), 0);
      if (exercises[biggest].sets > 2) {
        exercises[biggest] = { ...exercises[biggest], sets: exercises[biggest].sets - 1 };
        continue;
      }
      if (exercises.length > LIMITS.minExercisesPerDay) {
        exercises.pop();
        continue;
      }
      break;
    }

    if (exercises.length < LIMITS.minExercisesPerDay) {
      throw new PlanValidationError(`Day "${day.title}" has fewer than ${LIMITS.minExercisesPerDay} valid exercises.`);
    }

    return { ...day, exercises, estMinutes: estimateDayMinutes(exercises) };
  });

  if (input.limitations?.trim()) {
    notes.add("You mentioned an injury or condition. Please check this plan with a doctor or physiotherapist before starting, and stop any exercise that causes pain.");
  }
  notes.add("PandaFit gives general fitness guidance, not medical advice.");

  return { ...draft, days: safeDays, safetyNotes: [...notes] };
}

function findLastIndex<T>(arr: T[], pred: (t: T) => boolean) {
  for (let i = arr.length - 1; i >= 0; i--) if (pred(arr[i])) return i;
  return -1;
}
