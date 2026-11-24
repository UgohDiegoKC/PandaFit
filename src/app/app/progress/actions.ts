"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireUser } from "@/lib/auth";
import { track } from "@/lib/analytics";
import { activeBreak, isoDate, DAY_MS } from "@/lib/progress";

export type BreakState = { error?: string } | undefined;
const MAX_BREAK_DAYS = 42;

export async function startBreak(_: BreakState, form: FormData): Promise<BreakState> {
  const user = await requireUser();
  const today = isoDate(new Date());
  const endsOn = String(form.get("endsOn") ?? "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(endsOn) || endsOn < today) return { error: "Pick an end date from today onwards." };
  if (new Date(endsOn).getTime() - new Date(today).getTime() > MAX_BREAK_DAYS * DAY_MS) return { error: `Breaks can be up to ${MAX_BREAK_DAYS / 7} weeks.` };
  const existing = await db.select().from(schema.breaks).where(eq(schema.breaks.userId, user.id));
  if (activeBreak(existing, today)) return { error: "You're already on a break — end or adjust it first." };
  await db.insert(schema.breaks).values({ userId: user.id, startsOn: today, endsOn, reason: String(form.get("reason") ?? "").slice(0, 120) || null });
  await track("break_started", user.id, { days: Math.round((new Date(endsOn).getTime() - new Date(today).getTime()) / DAY_MS) + 1 });
  revalidatePath("/app", "layout");
}

export async function adjustBreak(id: string, form: FormData) {
  const user = await requireUser();
  const endsOn = String(form.get("endsOn") ?? "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(endsOn) || endsOn < isoDate(new Date())) return;
  await db.update(schema.breaks).set({ endsOn }).where(and(eq(schema.breaks.id, id), eq(schema.breaks.userId, user.id)));
  await track("break_adjusted", user.id);
  revalidatePath("/app", "layout");
}

export async function endBreak(id: string) {
  const user = await requireUser();
  const yesterday = isoDate(new Date(Date.now() - DAY_MS));
  await db.update(schema.breaks).set({ endedEarlyOn: yesterday }).where(and(eq(schema.breaks.id, id), eq(schema.breaks.userId, user.id)));
  await track("break_ended_early", user.id);
  revalidatePath("/app", "layout");
}
