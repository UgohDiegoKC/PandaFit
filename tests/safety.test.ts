import { describe, expect, it } from "vitest";
import { applySafety, estimateDayMinutes, LIMITS, PlanValidationError } from "@/lib/plan/safety";
import { generateFallbackPlan } from "@/lib/plan/fallback";
import { getExercise } from "@/lib/catalog";
import type { PlanDraft, PlannerInput } from "@/lib/plan/types";

const base: PlannerInput = { age: 30, sex: "male", weightKg: 80, heightCm: 180, goal: "build_muscle", experience: "intermediate", gymDays: [1, 3, 5], sessionMinutes: 60 };

const draft = (exercises: PlanDraft["days"][number]["exercises"], days = [1]): PlanDraft => ({
  name: "Test", summary: "s", rationale: "r",
  days: days.map((weekday) => ({ weekday, title: "Day", focus: "f", exercises })),
});
const ex = (slug: string, o: Partial<PlanDraft["days"][number]["exercises"][number]> = {}) => ({ slug, sets: 3, repsMin: 8, repsMax: 12, restSec: 90, weightGuidance: "g", ...o });

describe("applySafety", () => {
  it("drops exercises that aren't in the catalog (model hallucinations)", () => {
    const out = applySafety(draft([ex("made-up-curl"), ex("goblet-squat"), ex("lat-pulldown")]), { ...base, gymDays: [1] });
    expect(out.days[0].exercises.map((e) => e.slug)).toEqual(["goblet-squat", "lat-pulldown"]);
  });

  it("throws when a day has too few valid exercises so the caller can fall back", () => {
    expect(() => applySafety(draft([ex("nope"), ex("goblet-squat")]), { ...base, gymDays: [1] })).toThrow(PlanValidationError);
  });

  it("clamps sets, reps and rest into safe ranges", () => {
    const out = applySafety(draft([ex("leg-press", { sets: 12, repsMin: 0, repsMax: 200, restSec: 5 }), ex("lat-pulldown")]), { ...base, gymDays: [1], sessionMinutes: 90 });
    const e = out.days[0].exercises[0];
    expect(e.sets).toBeLessThanOrEqual(LIMITS.sets.max);
    expect(e.repsMin).toBeGreaterThanOrEqual(1);
    expect(e.repsMax).toBeLessThanOrEqual(LIMITS.reps.max);
    expect(e.restSec).toBeGreaterThanOrEqual(LIMITS.rest.compoundMin);
  });

  it("swaps high-risk lifts for safer alternatives for beginners", () => {
    const out = applySafety(draft([ex("barbell-back-squat"), ex("barbell-deadlift"), ex("lat-pulldown")]), { ...base, experience: "beginner", gymDays: [1] });
    for (const e of out.days[0].exercises) expect(getExercise(e.slug)!.highRisk).toBeFalsy();
  });

  it("adds a professional-clearance note when the user shares a limitation", () => {
    const out = applySafety(draft([ex("goblet-squat"), ex("lat-pulldown")]), { ...base, gymDays: [1], limitations: "bad knee" });
    expect(out.safetyNotes.some((n) => /doctor or physiotherapist/.test(n))).toBe(true);
  });

  it("maps days onto the user's chosen weekdays", () => {
    const out = applySafety(draft([ex("goblet-squat"), ex("lat-pulldown")], [0, 2]), { ...base, gymDays: [1, 4, 6] });
    expect(out.days.map((d) => d.weekday)).toEqual([1, 4, 6]);
  });

  it("trims each day to fit the session length", () => {
    const many = ["leg-press", "lat-pulldown", "dumbbell-bench-press", "seated-cable-row", "lateral-raise", "dumbbell-curl", "triceps-pushdown", "calf-raise"].map((s) => ex(s, { sets: 5, restSec: 180 }));
    const out = applySafety(draft(many), { ...base, gymDays: [1], sessionMinutes: 30 });
    expect(out.days[0].estMinutes).toBeLessThanOrEqual(Math.ceil(30 * LIMITS.durationTolerance) + 1);
  });

  it("always includes the not-medical-advice note", () => {
    const out = applySafety(draft([ex("goblet-squat"), ex("lat-pulldown")]), { ...base, gymDays: [1] });
    expect(out.safetyNotes.join(" ")).toMatch(/not medical advice/);
  });
});

describe("generateFallbackPlan", () => {
  const goals = ["build_muscle", "lose_fat", "get_stronger", "general_fitness", "endurance"] as const;
  const levels = ["beginner", "intermediate", "advanced"] as const;

  it.each(goals.flatMap((g) => levels.flatMap((l) => [1, 2, 3, 4, 5, 6].map((n) => [g, l, n] as const))))(
    "produces a valid, safe plan (%s, %s, %i days)",
    (goal, experience, n) => {
      const input: PlannerInput = { ...base, goal, experience, gymDays: [0, 1, 2, 3, 4, 5].slice(0, n), sessionMinutes: 45 };
      const plan = applySafety(generateFallbackPlan(input), input);
      expect(plan.days).toHaveLength(n);
      for (const d of plan.days) {
        expect(d.exercises.length).toBeGreaterThanOrEqual(LIMITS.minExercisesPerDay);
        expect(estimateDayMinutes(d.exercises)).toBe(d.estMinutes);
        for (const e of d.exercises) expect(getExercise(e.slug)).toBeDefined();
      }
    },
  );
});
