/**
 * Rule-based plan generator. Used when the AI provider is unavailable, times out,
 * or returns output that fails validation — so sign-up never dead-ends.
 */
import { getExercise } from "../catalog";
import { GOAL_LABEL, WEEKDAY_LONG, type PlanDraft, type PlanExerciseDraft, type PlannerInput } from "./types";

type Slot = { slugs: { beginner: string; intermediate: string; advanced?: string }; kind: "main" | "accessory" | "core" | "conditioning" };

const s = (beginner: string, intermediate = beginner, advanced?: string) => ({ beginner, intermediate, advanced });

const TEMPLATES: Record<string, { title: string; focus: string; slots: Slot[] }> = {
  fullA: { title: "Full Body A", focus: "Squat, horizontal push and pull", slots: [
    { slugs: s("goblet-squat", "barbell-back-squat"), kind: "main" },
    { slugs: s("dumbbell-bench-press", "barbell-bench-press"), kind: "main" },
    { slugs: s("seated-cable-row", "barbell-row"), kind: "main" },
    { slugs: s("romanian-deadlift"), kind: "accessory" },
    { slugs: s("lateral-raise"), kind: "accessory" },
    { slugs: s("plank"), kind: "core" },
  ] },
  fullB: { title: "Full Body B", focus: "Hinge, vertical push and pull", slots: [
    { slugs: s("hip-thrust", "romanian-deadlift", "barbell-deadlift"), kind: "main" },
    { slugs: s("dumbbell-shoulder-press", "barbell-overhead-press"), kind: "main" },
    { slugs: s("lat-pulldown", "pull-up"), kind: "main" },
    { slugs: s("split-squat", "walking-lunge"), kind: "accessory" },
    { slugs: s("dumbbell-curl"), kind: "accessory" },
    { slugs: s("dead-bug", "pallof-press"), kind: "core" },
  ] },
  fullC: { title: "Full Body C", focus: "Machines and unilateral work", slots: [
    { slugs: s("leg-press"), kind: "main" },
    { slugs: s("incline-dumbbell-press"), kind: "main" },
    { slugs: s("chest-supported-row"), kind: "main" },
    { slugs: s("leg-curl"), kind: "accessory" },
    { slugs: s("face-pull"), kind: "accessory" },
    { slugs: s("cable-crunch"), kind: "core" },
  ] },
  upperA: { title: "Upper A", focus: "Chest, back and arms", slots: [
    { slugs: s("dumbbell-bench-press", "barbell-bench-press"), kind: "main" },
    { slugs: s("seated-cable-row", "barbell-row"), kind: "main" },
    { slugs: s("dumbbell-shoulder-press"), kind: "accessory" },
    { slugs: s("lat-pulldown"), kind: "accessory" },
    { slugs: s("triceps-pushdown"), kind: "accessory" },
    { slugs: s("dumbbell-curl"), kind: "accessory" },
  ] },
  lowerA: { title: "Lower A", focus: "Quads and glutes", slots: [
    { slugs: s("goblet-squat", "barbell-back-squat"), kind: "main" },
    { slugs: s("romanian-deadlift"), kind: "main" },
    { slugs: s("leg-extension"), kind: "accessory" },
    { slugs: s("calf-raise"), kind: "accessory" },
    { slugs: s("plank"), kind: "core" },
  ] },
  upperB: { title: "Upper B", focus: "Shoulders, back and arms", slots: [
    { slugs: s("machine-shoulder-press", "barbell-overhead-press"), kind: "main" },
    { slugs: s("lat-pulldown", "pull-up"), kind: "main" },
    { slugs: s("incline-dumbbell-press"), kind: "accessory" },
    { slugs: s("chest-supported-row"), kind: "accessory" },
    { slugs: s("lateral-raise"), kind: "accessory" },
    { slugs: s("hammer-curl"), kind: "accessory" },
  ] },
  lowerB: { title: "Lower B", focus: "Hamstrings and glutes", slots: [
    { slugs: s("hip-thrust", "romanian-deadlift", "barbell-deadlift"), kind: "main" },
    { slugs: s("leg-press"), kind: "main" },
    { slugs: s("leg-curl"), kind: "accessory" },
    { slugs: s("walking-lunge"), kind: "accessory" },
    { slugs: s("dead-bug", "pallof-press"), kind: "core" },
  ] },
  push: { title: "Push", focus: "Chest, shoulders and triceps", slots: [
    { slugs: s("dumbbell-bench-press", "barbell-bench-press"), kind: "main" },
    { slugs: s("dumbbell-shoulder-press", "barbell-overhead-press"), kind: "main" },
    { slugs: s("incline-dumbbell-press"), kind: "accessory" },
    { slugs: s("cable-fly"), kind: "accessory" },
    { slugs: s("lateral-raise"), kind: "accessory" },
    { slugs: s("triceps-pushdown"), kind: "accessory" },
  ] },
  pull: { title: "Pull", focus: "Back and biceps", slots: [
    { slugs: s("lat-pulldown", "pull-up"), kind: "main" },
    { slugs: s("seated-cable-row", "barbell-row"), kind: "main" },
    { slugs: s("chest-supported-row"), kind: "accessory" },
    { slugs: s("face-pull"), kind: "accessory" },
    { slugs: s("dumbbell-curl"), kind: "accessory" },
    { slugs: s("hammer-curl"), kind: "accessory" },
  ] },
  legs: { title: "Legs", focus: "Quads, hamstrings, glutes and calves", slots: [
    { slugs: s("goblet-squat", "barbell-back-squat"), kind: "main" },
    { slugs: s("romanian-deadlift"), kind: "main" },
    { slugs: s("leg-press"), kind: "accessory" },
    { slugs: s("leg-curl"), kind: "accessory" },
    { slugs: s("calf-raise"), kind: "accessory" },
    { slugs: s("cable-crunch"), kind: "core" },
  ] },
};

const SPLITS: Record<number, string[]> = {
  1: ["fullA"],
  2: ["fullA", "fullB"],
  3: ["fullA", "fullB", "fullC"],
  4: ["upperA", "lowerA", "upperB", "lowerB"],
  5: ["push", "pull", "legs", "upperA", "lowerB"],
  6: ["push", "pull", "legs", "push", "pull", "legs"],
};

function prescription(goal: PlannerInput["goal"], kind: Slot["kind"], experience: PlannerInput["experience"]) {
  const sets = experience === "beginner" ? 3 : kind === "main" ? 4 : 3;
  if (kind === "core") return { sets: 3, repsMin: 10, repsMax: 15, restSec: 45 };
  if (kind === "conditioning") return { sets: 6, repsMin: 30, repsMax: 30, restSec: 60 };
  switch (goal) {
    case "get_stronger":
      return kind === "main" ? { sets, repsMin: 4, repsMax: 6, restSec: 180 } : { sets: 3, repsMin: 8, repsMax: 12, restSec: 90 };
    case "build_muscle":
      return kind === "main" ? { sets, repsMin: 6, repsMax: 10, restSec: 120 } : { sets: 3, repsMin: 10, repsMax: 15, restSec: 75 };
    case "lose_fat":
      return { sets: 3, repsMin: 10, repsMax: 15, restSec: kind === "main" ? 75 : 45 };
    case "endurance":
      return { sets: 3, repsMin: 12, repsMax: 20, restSec: kind === "main" ? 60 : 30 };
    default:
      return kind === "main" ? { sets: 3, repsMin: 8, repsMax: 12, restSec: 90 } : { sets: 3, repsMin: 10, repsMax: 12, restSec: 60 };
  }
}

const GUIDANCE: Record<Slot["kind"], string> = {
  main: "Pick a weight you could lift 2 more reps with good form. Add a little next session when you hit the top of the rep range on every set.",
  accessory: "Moderate weight; control the lowering phase and stop 1–2 reps short of failure.",
  core: "Bodyweight or light load. Quality over speed.",
  conditioning: "Reps are seconds of hard effort. Work at a pace you can repeat for every round.",
};

export function generateFallbackPlan(input: PlannerInput): PlanDraft {
  const days = [...new Set(input.gymDays)].sort((a, b) => a - b);
  const split = SPLITS[Math.min(6, Math.max(1, days.length))];
  const level = input.experience;
  const conditioning = input.goal === "lose_fat" || input.goal === "endurance";

  return {
    name: `${GOAL_LABEL[input.goal]} · ${days.length}-day plan`,
    summary: `A ${days.length}-day ${split[0].startsWith("full") ? "full-body" : split[0].startsWith("upper") ? "upper/lower" : "push/pull/legs"} program built around your ${input.sessionMinutes}-minute sessions.`,
    rationale: [
      `You train on ${days.map((d) => WEEKDAY_LONG[d]).join(", ")}, so each session is a complete workout that fits those days.`,
      `Rep ranges and rest times are set for your goal (${GOAL_LABEL[input.goal].toLowerCase()}) and ${level} experience.`,
      "Progress by adding a rep or a small amount of weight once you reach the top of the range on every set.",
      conditioning ? "Short conditioning intervals are added at the end of sessions to support your goal." : "",
    ].filter(Boolean).join(" "),
    days: days.map((weekday, i) => {
      const t = TEMPLATES[split[i % split.length]];
      const exercises: PlanExerciseDraft[] = t.slots.map((slot) => {
        const slug = (level === "advanced" && slot.slugs.advanced) || (level === "beginner" ? slot.slugs.beginner : slot.slugs.intermediate);
        return { slug, ...prescription(input.goal, slot.kind, level), weightGuidance: GUIDANCE[slot.kind], notes: getExercise(slug)?.cues[0] ?? null };
      });
      if (conditioning) {
        exercises.push({ slug: i % 2 ? "rower-intervals" : "bike-intervals", ...prescription(input.goal, "conditioning", level), weightGuidance: GUIDANCE.conditioning, notes: null });
      }
      return { weekday, title: t.title, focus: t.focus, exercises };
    }),
  };
}
