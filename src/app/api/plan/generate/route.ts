import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { track } from "@/lib/analytics";
import { generatePlanForUser } from "@/lib/plan/service";

export const runtime = "nodejs";
export const maxDuration = 60;

/** POST /api/plan/generate — (re)generate the signed-in user's plan. Shared by web, iOS and Android. */
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!user.onboardedAt) return NextResponse.json({ error: "onboarding_incomplete" }, { status: 409 });
  try {
    const result = await generatePlanForUser(user.id);
    const trigger = new URL(req.url).searchParams.get("trigger") === "regenerate" ? "regenerate" : "signup";
    await track("plan_generated", user.id, { source: result.source, trigger, ...(result.fallbackReason ? { fallbackReason: result.fallbackReason } : {}) });
    return NextResponse.json(result);
  } catch (e) {
    console.error("[plan] generation failed", e);
    return NextResponse.json({ error: "generation_failed" }, { status: 500 });
  }
}
