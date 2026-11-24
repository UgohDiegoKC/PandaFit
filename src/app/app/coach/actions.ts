"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { BookingError, bookSeries, cancelBooking, rescheduleBooking, type Cadence } from "@/lib/coach";
import { dispatchDue, getPrefs } from "@/lib/notify/service";
import { formatInZone } from "@/lib/tz";

export type BookingResult = { error?: string; message?: string };

async function run(fn: (userId: string, tz: string) => Promise<string>): Promise<BookingResult> {
  const user = await requireUser();
  const { timezone } = await getPrefs(user.id);
  try {
    const message = await fn(user.id, timezone);
    await dispatchDue(new Date()).catch((e) => console.error("[booking] notify failed", e)); // confirmations go out now
    revalidatePath("/app/coach");
    return { message };
  } catch (e) {
    if (e instanceof BookingError) return { error: e.message };
    console.error("[booking]", e);
    return { error: "Something went wrong. Please try again." };
  }
}

export async function book(slotId: string, cadence: Cadence) {
  return run(async (uid, tz) => {
    const r = await bookSeries(uid, slotId, cadence, tz);
    const missing = r.unavailable.length ? ` ${r.unavailable.length} later date${r.unavailable.length > 1 ? "s weren't" : " wasn't"} available (${r.unavailable.map((d) => formatInZone(d, tz, { day: "numeric", month: "short" })).join(", ")}) — book those separately.` : "";
    return `Booked ${r.booked.length} check-in${r.booked.length > 1 ? "s" : ""}.${missing}`;
  });
}

export async function reschedule(bookingId: string, slotId: string) {
  return run(async (uid, tz) => { await rescheduleBooking(uid, bookingId, slotId, tz); return "Check-in moved."; });
}

export async function cancel(bookingId: string, scope: "one" | "series") {
  return run(async (uid, tz) => { const n = await cancelBooking(uid, bookingId, scope, tz); return `Cancelled ${n} check-in${n > 1 ? "s" : ""}.`; });
}
