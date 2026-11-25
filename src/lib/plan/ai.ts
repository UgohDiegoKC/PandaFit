/**
 * Server-side AI plan generation. Model credentials never leave the server.
 * The model must answer through a tool call whose input is validated with zod,
 * restricted to catalog exercise slugs, then passed through applySafety().
 */
import Anthropic from "@anthropic-ai/sdk";
import { CATALOG } from "../catalog";
import { GOAL_LABEL, WEEKDAY_LONG, planDraftSchema, type PlanDraft, type PlannerInput } from "./types";

export const PROMPT_VERSION = "plan-v1.2";

export type AiOutcome = "success" | "invalid_output" | "timeout" | "error" | "no_api_key";

export interface AiResult {
  outcome: AiOutcome;
  draft?: PlanDraft;
  model?: string;
  latencyMs: number;
  inputTokens?: number;
  outputTokens?: number;
  error?: string;
}

const SYSTEM = `You are PandaFit's strength & conditioning planner. You design safe, effective weekly gym programs for healthy adults.

Rules you must follow:
- Use ONLY exercise slugs from the provided catalog. Never invent exercises.
- Produce exactly one training day per requested weekday, using those weekday numbers (0=Sunday … 6=Saturday).
- Each day must fit the stated session length including ~5 minutes of warm-up. Prefer 4–7 exercises.
- Balance push/pull and lower-body patterns across the week; avoid training the same muscle group hard on consecutive days.
- Beginners: favour machines, dumbbells and simple patterns; 2–4 sets; avoid max-effort or very low-rep work.
- If the user lists injuries or conditions, avoid exercises that obviously load that area, keep loads moderate, and say so in the rationale.
- Weight guidance must be effort-based (e.g. "stop 2 reps short of failure"), never a specific kilogram target.
- For exercises tagged "timed", reps mean seconds.
- You are not a doctor. Do not diagnose, and do not give medical or nutritional prescriptions.
- Explain in the rationale, in plain language, how the user's goal, experience and schedule shaped the plan.`;

function catalogForPrompt() {
  return CATALOG.map(
    (e) => `${e.slug} | ${e.name} | ${e.primary.join("+")} | ${e.equipment.join("/")} | ${e.level}${e.compound ? " | compound" : ""}${e.tags.includes("timed") ? " | timed" : ""}`,
  ).join("\n");
}

function userPrompt(input: PlannerInput) {
  const days = [...new Set(input.gymDays)].sort((a, b) => a - b);
  return `Design a weekly plan for this user.

Goal: ${GOAL_LABEL[input.goal]}
Experience: ${input.experience}
Age: ${input.age}
Sex: ${input.sex.replace("_", " ")}
Body: ${Math.round(input.heightCm)} cm, ${Math.round(input.weightKg)} kg
Gym days: ${days.map((d) => `${d} (${WEEKDAY_LONG[d]})`).join(", ")}
Session length: ${input.sessionMinutes} minutes
Injuries / conditions shared by user: ${input.limitations?.trim() || "none"}

Exercise catalog (slug | name | primary muscles | equipment | level | flags):
${catalogForPrompt()}

Call the save_workout_plan tool with the plan.`;
}

const TOOL: Anthropic.Tool = {
  name: "save_workout_plan",
  description: "Save the personalised weekly workout plan.",
  input_schema: {
    type: "object",
    required: ["name", "summary", "rationale", "days"],
    properties: {
      name: { type: "string", description: "Short plan name, max 80 chars" },
      summary: { type: "string", description: "One or two sentences, max 400 chars" },
      rationale: { type: "string", description: "Why this plan fits the user, max 1200 chars" },
      days: {
        type: "array",
        items: {
          type: "object",
          required: ["weekday", "title", "focus", "exercises"],
          properties: {
            weekday: { type: "integer", minimum: 0, maximum: 6 },
            title: { type: "string" },
            focus: { type: "string" },
            exercises: {
              type: "array",
              items: {
                type: "object",
                required: ["slug", "sets", "repsMin", "repsMax", "restSec", "weightGuidance"],
                properties: {
                  slug: { type: "string" },
                  sets: { type: "integer" },
                  repsMin: { type: "integer" },
                  repsMax: { type: "integer" },
                  restSec: { type: "integer" },
                  weightGuidance: { type: "string" },
                  notes: { type: "string" },
                },
              },
            },
          },
        },
      },
    },
  },
};

export async function generateAiPlan(input: PlannerInput): Promise<AiResult> {
  const started = Date.now();
  const apiKey = process.env.ANTHROPIC_API_KEY;
  const model = process.env.AI_MODEL || "claude-sonnet-5-5";
  if (!apiKey) return { outcome: "no_api_key", latencyMs: 0 };

  const client = new Anthropic({ apiKey, timeout: Number(process.env.AI_TIMEOUT_MS ?? 25_000), maxRetries: 1 });
  try {
    const res = await client.messages.create({
      model,
      max_tokens: 8000,
      system: SYSTEM,
      tools: [TOOL],
      // Claude Sonnet 5.5 rejects forced tool_choice ("tool"/"any") with a 400, so use "auto";
      // the prompt asks for the tool call, and a missing call falls back to the template plan.
      tool_choice: { type: "auto" },
      // Thinking is on by default on Sonnet 5.5; turn it off to stay within the request timeout.
      thinking: { type: "between_tools" },
      messages: [{ role: "user", content: userPrompt(input) }],
    });
    const latencyMs = Date.now() - started;
    const usage = { inputTokens: res.usage.input_tokens, outputTokens: res.usage.output_tokens };
    const block = res.content.find((b) => b.type === "tool_use");
    if (!block || block.type !== "tool_use") {
      return { outcome: "invalid_output", model, latencyMs, ...usage, error: "No tool call in response" };
    }
    const parsed = planDraftSchema.safeParse(block.input);
    if (!parsed.success) {
      return { outcome: "invalid_output", model, latencyMs, ...usage, error: parsed.error.issues.slice(0, 3).map((i) => `${i.path.join(".")}: ${i.message}`).join("; ") };
    }
    return { outcome: "success", draft: parsed.data, model, latencyMs, ...usage };
  } catch (err) {
    const latencyMs = Date.now() - started;
    const timedOut = err instanceof Anthropic.APIConnectionTimeoutError;
    return { outcome: timedOut ? "timeout" : "error", model, latencyMs, error: err instanceof Error ? err.message.slice(0, 300) : "unknown" };
  }
}
