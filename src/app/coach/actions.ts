"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { BookingError, createSlots, deleteSlot, setSlotBlocked } from "@/lib/coach";
import { getPrefs } from "@/lib/notify/service";
import { formatInZone, hhmmToMin } from "@/lib/tz";

export type SlotState = { error?: string; message?: string } | undefined;

export async function addSlots(_: SlotState, form: FormData): Promise<SlotState> {
  const coach = await requireRole("coach", "admin");
  const { timezone } = await getPrefs(coach.id);
  const date = String(form.get("date") ?? "");
  const startMin = hhmmToMin(String(form.get("time") ?? ""));
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(startMin)) return { error: "Pick a date and time." };
  try {
    const r = await createSlots({ coachId: coach.id, date, startMin, durationMin: Number(form.get("duration")), repeatWeeks: Number(form.get("repeat")), timezone });
    revalidatePath("/coach");
    const c = r.conflicts.length ? ` Skipped ${r.conflicts.length} that overlapped existing slots (${r.conflicts.map((d) => formatInZone(d, timezone, { day: "numeric", month: "short" })).join(", ")}).` : "";
    return { message: `Added ${r.created.length} slot${r.created.length === 1 ? "" : "s"}.${c}` };
  } catch (e) {
    return { error: e instanceof BookingError ? e.message : "Couldn't add slots." };
  }
}

export async function toggleBlock(slotId: string, blocked: boolean) {
  const coach = await requireRole("coach", "admin");
  try { await setSlotBlocked(coach.id, slotId, blocked); } catch (e) { return { error: e instanceof BookingError ? e.message : "Failed" }; }
  revalidatePath("/coach");
  return {};
}

export async function removeSlot(slotId: string) {
  const coach = await requireRole("coach", "admin");
  try { await deleteSlot(coach.id, slotId); } catch (e) { return { error: e instanceof BookingError ? e.message : "Failed" }; }
  revalidatePath("/coach");
  return {};
}
