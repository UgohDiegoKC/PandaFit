import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { runReminderJob } from "@/lib/notify/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

function authorised(req: Request) {
  const secret = process.env.CRON_SECRET;
  const header = req.headers.get("authorization") ?? "";
  if (!secret) return false;
  const a = Buffer.from(header), b = Buffer.from(`Bearer ${secret}`);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * POST /api/cron/reminders — called every 5 minutes by .github/workflows/reminders.yml.
 * GET does the same so Vercel Cron (which sends GET with `Authorization: Bearer $CRON_SECRET`) can call it too.
 */
export async function POST(req: Request) {
  if (!authorised(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const summary = await runReminderJob();
  console.info("[reminders]", JSON.stringify(summary));
  return NextResponse.json(summary);
}

export const GET = POST;
