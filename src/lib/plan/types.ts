import { z } from "zod";

export const GOALS = ["build_muscle", "lose_fat", "get_stronger", "general_fitness", "endurance"] as const;
export const EXPERIENCE = ["beginner", "intermediate", "advanced"] as const;
export const SEXES = ["male", "female", "other", "prefer_not"] as const;
export const SESSION_LENGTHS = [30, 45, 60, 75, 90] as const;

export const GOAL_LABEL: Record<(typeof GOALS)[number], string> = {
  build_muscle: "Build muscle",
  lose_fat: "Lose fat",
  get_stronger: "Get stronger",
  general_fitness: "General fitness",
  endurance: "Endurance",
};

export const WEEKDAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export const WEEKDAY_LONG = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/** What the planner is allowed to know about the user. No name, email or identifiers. */
export interface PlannerInput {
  age: number;
  sex: (typeof SEXES)[number];
  weightKg: number;
  heightCm: number;
  goal: (typeof GOALS)[number];
  experience: (typeof EXPERIENCE)[number];
  gymDays: number[];
  sessionMinutes: number;
  limitations?: string | null;
}

/** Structured output contract for plan generation (AI and fallback both produce this). */
export const planExerciseSchema = z.object({
  slug: z.string().min(1),
  sets: z.number().int(),
  repsMin: z.number().int(),
  repsMax: z.number().int(),
  restSec: z.number().int(),
  weightGuidance: z.string().max(200),
  notes: z.string().max(240).optional().nullable(),
});

export const planDaySchema = z.object({
  weekday: z.number().int().min(0).max(6),
  title: z.string().min(1).max(60),
  focus: z.string().min(1).max(120),
  exercises: z.array(planExerciseSchema).min(1).max(12),
});

export const planDraftSchema = z.object({
  name: z.string().min(1).max(80),
  summary: z.string().min(1).max(400),
  rationale: z.string().min(1).max(1200),
  days: z.array(planDaySchema).min(1).max(7),
});

export type PlanExerciseDraft = z.infer<typeof planExerciseSchema>;
export type PlanDayDraft = z.infer<typeof planDaySchema> & { estMinutes?: number };
export type PlanDraft = Omit<z.infer<typeof planDraftSchema>, "days"> & { days: PlanDayDraft[] };

export interface SafePlan extends PlanDraft {
  days: (PlanDayDraft & { estMinutes: number })[];
  safetyNotes: string[];
}

export const onboardingSchema = z.object({
  age: z.coerce.number().int().min(18, "PandaFit is for adults 18+ during the MVP.").max(100),
  sex: z.enum(SEXES),
  weight: z.coerce.number().positive(),
  height: z.coerce.number().positive(),
  unitSystem: z.enum(["metric", "imperial"]),
  goal: z.enum(GOALS),
  experience: z.enum(EXPERIENCE),
  gymDays: z.array(z.coerce.number().int().min(0).max(6)).min(1, "Pick at least one gym day.").max(6, "Leave at least one rest day."),
  sessionMinutes: z.coerce.number().int().min(20).max(120),
  limitations: z.string().max(500).optional(),
  healthConsent: z.literal(true, { error: "We need your consent to use these details to build your plan." }),
});
export type OnboardingInput = z.infer<typeof onboardingSchema>;
