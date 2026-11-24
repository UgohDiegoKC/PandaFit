import "server-only";
import { and, asc, eq, gt, gte, inArray, lt, ne } from "drizzle-orm";
import { db, schema } from "@/db";
import { track } from "./analytics";
import { enqueueNow, getPrefs } from "./notify/service";
import { formatInZone, zonedToUtc, addDays } from "./tz";

/**
 * Pro coach availability + check-in bookings.
 * Integrity rules:
 *  - a coach can't have overlapping slots (checked on create)
 *  - a slot holds at most one confirmed booking (partial unique index in the DB)
 *  - booked slots can't be blocked or deleted until the booking is cancelled
 *  - bookings need MIN_NOTICE_MS lead time; past slots are never offered
 */

export const MIN_NOTICE_MS = 2 * 3600_000;
export const SERIES_LENGTH = 4; // occurrences booked up-front for weekly / bi-weekly cadence
export const CADENCE_DAYS = { weekly: 7, biweekly: 14 } as const;
export type Cadence = keyof typeof CADENCE_DAYS;

export class BookingError extends Error {}

export const overlaps = (aStart: number, aMin: number, bStart: number, bMin: number) =>
  aStart < bStart + bMin * 60_000 && bStart < aStart + aMin * 60_000;

// ── Coach side ────────────────────────────────────────────────────

export interface NewSlotsInput { coachId: string; date: string; startMin: number; durationMin: number; repeatWeeks: number; timezone: string }

export async function createSlots(i: NewSlotsInput, now = new Date()) {
  if (![15, 30, 45, 60].includes(i.durationMin)) throw new BookingError("Slot length must be 15, 30, 45 or 60 minutes.");
  if (i.repeatWeeks < 0 || i.repeatWeeks > 12) throw new BookingError("Repeat for up to 12 weeks.");
  const starts = Array.from({ length: i.repeatWeeks + 1 }, (_, w) => zonedToUtc(addDays(i.date, w * 7), i.startMin, i.timezone));
  if (starts[0] <= now) throw new BookingError("Pick a time in the future.");

  const existing = await db.select().from(schema.coachSlots).where(and(
    eq(schema.coachSlots.coachId, i.coachId),
    gte(schema.coachSlots.startsAt, new Date(starts[0].getTime() - 24 * 3600_000)),
    lt(schema.coachSlots.startsAt, new Date(starts.at(-1)!.getTime() + 24 * 3600_000)),
  ));
  const created: Date[] = [];
  const conflicts: Date[] = [];
  for (const s of starts) {
    if (existing.some((e) => overlaps(e.startsAt.getTime(), e.durationMin, s.getTime(), i.durationMin))) conflicts.push(s);
    else {
      await db.insert(schema.coachSlots).values({ coachId: i.coachId, startsAt: s, durationMin: i.durationMin });
      existing.push({ id: "", coachId: i.coachId, startsAt: s, durationMin: i.durationMin, blocked: false, createdAt: now });
      created.push(s);
    }
  }
  return { created, conflicts };
}

async function confirmedBookingFor(slotId: string) {
  return db.query.proBookings.findFirst({ where: and(eq(schema.proBookings.slotId, slotId), eq(schema.proBookings.status, "confirmed")) });
}

export async function setSlotBlocked(coachId: string, slotId: string, blocked: boolean) {
  if (blocked && (await confirmedBookingFor(slotId))) throw new BookingError("This slot is booked. Cancel the booking first.");
  await db.update(schema.coachSlots).set({ blocked }).where(and(eq(schema.coachSlots.id, slotId), eq(schema.coachSlots.coachId, coachId)));
}

export async function deleteSlot(coachId: string, slotId: string) {
  if (await confirmedBookingFor(slotId)) throw new BookingError("This slot is booked. Cancel the booking first.");
  await db.delete(schema.coachSlots).where(and(eq(schema.coachSlots.id, slotId), eq(schema.coachSlots.coachId, coachId)));
}

export async function coachSchedule(coachId: string, now = new Date()) {
  const slots = await db.select().from(schema.coachSlots)
    .where(and(eq(schema.coachSlots.coachId, coachId), gt(schema.coachSlots.startsAt, new Date(now.getTime() - 3600_000))))
    .orderBy(asc(schema.coachSlots.startsAt));
  const bookings = slots.length ? await db.select({ b: schema.proBookings, name: schema.users.name })
    .from(schema.proBookings).innerJoin(schema.users, eq(schema.proBookings.userId, schema.users.id))
    .where(and(inArray(schema.proBookings.slotId, slots.map((s) => s.id)), eq(schema.proBookings.status, "confirmed"))) : [];
  return slots.map((s) => {
    const bk = bookings.find((x) => x.b.slotId === s.id);
    return { ...s, booking: bk ? { id: bk.b.id, firstName: bk.name.split(" ")[0], cadence: bk.b.cadence } : null };
  });
}

// ── Member side ───────────────────────────────────────────────────

export async function openSlots(now = new Date(), days = 21) {
  const slots = await db.select({ s: schema.coachSlots, coachName: schema.users.name })
    .from(schema.coachSlots).innerJoin(schema.users, eq(schema.coachSlots.coachId, schema.users.id))
    .where(and(eq(schema.coachSlots.blocked, false), gt(schema.coachSlots.startsAt, new Date(now.getTime() + MIN_NOTICE_MS)), lt(schema.coachSlots.startsAt, new Date(now.getTime() + days * 864e5))))
    .orderBy(asc(schema.coachSlots.startsAt));
  if (!slots.length) return [];
  const taken = new Set((await db.select({ slotId: schema.proBookings.slotId }).from(schema.proBookings)
    .where(and(inArray(schema.proBookings.slotId, slots.map((x) => x.s.id)), eq(schema.proBookings.status, "confirmed")))).map((r) => r.slotId));
  return slots.filter((x) => !taken.has(x.s.id)).map((x) => ({ ...x.s, coachName: x.coachName }));
}

export async function myBookings(userId: string, now = new Date()) {
  return db.select({ b: schema.proBookings, startsAt: schema.coachSlots.startsAt, durationMin: schema.coachSlots.durationMin, coachName: schema.users.name })
    .from(schema.proBookings)
    .innerJoin(schema.coachSlots, eq(schema.proBookings.slotId, schema.coachSlots.id))
    .innerJoin(schema.users, eq(schema.proBookings.coachId, schema.users.id))
    .where(and(eq(schema.proBookings.userId, userId), eq(schema.proBookings.status, "confirmed"), gt(schema.coachSlots.startsAt, now)))
    .orderBy(asc(schema.coachSlots.startsAt));
}

async function loadMember(userId: string) {
  const user = await db.query.users.findFirst({ where: eq(schema.users.id, userId) });
  if (!user) throw new BookingError("Account not found.");
  if (!user.isPro) throw new BookingError("Coach check-ins are part of PandaFit Pro.");
  return user;
}

async function bookableSlot(slotId: string, now: Date) {
  const slot = await db.query.coachSlots.findFirst({ where: eq(schema.coachSlots.id, slotId) });
  if (!slot || slot.blocked) throw new BookingError("That time is no longer available.");
  if (slot.startsAt.getTime() < now.getTime() + MIN_NOTICE_MS) throw new BookingError("Please pick a time at least 2 hours from now.");
  return slot;
}

const isUniqueViolation = (e: unknown) => /UNIQUE constraint failed/i.test(String((e as Error)?.message ?? e) + String((e as { cause?: unknown })?.cause ?? ""));

async function notifyBoth(userId: string, coachId: string, key: string, title: string, userBody: string, coachBody: string) {
  await enqueueNow(userId, { title, body: userBody, url: "/app/coach", dedupeKey: `${key}:user` });
  await enqueueNow(coachId, { title, body: coachBody, url: "/coach", dedupeKey: `${key}:coach` });
}

const when = (d: Date, tz: string) => formatInZone(d, tz);
const tzOf = async (userId: string) => (await getPrefs(userId)).timezone;

/**
 * Books the chosen slot, then tries to book the same coach + time for the next
 * occurrences of the cadence. Returns what was booked and which dates were unavailable.
 */
export async function bookSeries(userId: string, slotId: string, cadence: Cadence, timezone: string, now = new Date()) {
  const user = await loadMember(userId);
  const active = await myBookings(userId, now);
  if (active.length) throw new BookingError("You already have check-ins booked. Reschedule or cancel those first.");
  const first = await bookableSlot(slotId, now);
  const seriesId = crypto.randomUUID();
  const booked: Date[] = [];
  const unavailable: Date[] = [];

  try {
    await db.insert(schema.proBookings).values({ userId, coachId: first.coachId, slotId: first.id, seriesId, cadence });
  } catch (e) {
    if (isUniqueViolation(e)) throw new BookingError("Someone just booked that time. Please pick another.");
    throw e;
  }
  booked.push(first.startsAt);

  for (let k = 1; k < SERIES_LENGTH; k++) {
    const target = new Date(first.startsAt.getTime() + k * CADENCE_DAYS[cadence] * 864e5);
    const slot = await db.query.coachSlots.findFirst({ where: and(eq(schema.coachSlots.coachId, first.coachId), eq(schema.coachSlots.startsAt, target), eq(schema.coachSlots.blocked, false)) });
    if (!slot) { unavailable.push(target); continue; }
    try {
      await db.insert(schema.proBookings).values({ userId, coachId: first.coachId, slotId: slot.id, seriesId, cadence });
      booked.push(target);
    } catch (e) {
      if (isUniqueViolation(e)) unavailable.push(target);
      else throw e;
    }
  }

  const coachTz = await tzOf(first.coachId);
  await notifyBoth(userId, first.coachId, `booked:${seriesId}`, "Check-in booked ✅",
    `You're booked with your coach (${cadence === "weekly" ? "weekly" : "every two weeks"}): ${booked.map((d) => when(d, timezone)).join(", ")}.${unavailable.length ? ` Not available: ${unavailable.map((d) => when(d, timezone)).join(", ")} — pick other times in the app.` : ""}`,
    `${user.name.split(" ")[0]} booked ${cadence} check-ins: ${booked.map((d) => when(d, coachTz)).join(", ")}.`);
  await track("pro_booking_created", userId, { cadence, booked: booked.length, unavailable: unavailable.length });
  return { seriesId, booked, unavailable };
}

export async function rescheduleBooking(userId: string, bookingId: string, newSlotId: string, timezone: string, now = new Date()) {
  const user = await loadMember(userId);
  const old = await db.query.proBookings.findFirst({ where: and(eq(schema.proBookings.id, bookingId), eq(schema.proBookings.userId, userId), eq(schema.proBookings.status, "confirmed")) });
  if (!old) throw new BookingError("Booking not found.");
  const slot = await bookableSlot(newSlotId, now);
  try {
    await db.transaction(async (tx) => {
      await tx.update(schema.proBookings).set({ status: "cancelled", cancelledAt: now }).where(eq(schema.proBookings.id, old.id));
      await tx.insert(schema.proBookings).values({ userId, coachId: slot.coachId, slotId: slot.id, seriesId: old.seriesId, cadence: old.cadence });
    });
  } catch (e) {
    if (isUniqueViolation(e)) throw new BookingError("Someone just booked that time. Please pick another.");
    throw e;
  }
  const coachTz = await tzOf(slot.coachId);
  await notifyBoth(userId, slot.coachId, `resched:${old.id}:${slot.id}`, "Check-in moved",
    `Your check-in is now ${when(slot.startsAt, timezone)}.`, `${user.name.split(" ")[0]} moved a check-in to ${when(slot.startsAt, coachTz)}.`);
  await track("pro_booking_rescheduled", userId);
}

export async function cancelBooking(userId: string, bookingId: string, scope: "one" | "series", timezone: string, now = new Date()) {
  const user = await db.query.users.findFirst({ where: eq(schema.users.id, userId) });
  const bk = await db.query.proBookings.findFirst({ where: and(eq(schema.proBookings.id, bookingId), eq(schema.proBookings.userId, userId), eq(schema.proBookings.status, "confirmed")) });
  if (!bk || !user) throw new BookingError("Booking not found.");
  const future = await myBookings(userId, now);
  const ids = scope === "series" ? future.filter((f) => f.b.seriesId === bk.seriesId).map((f) => f.b.id) : [bk.id];
  await db.update(schema.proBookings).set({ status: "cancelled", cancelledAt: now }).where(and(inArray(schema.proBookings.id, ids), ne(schema.proBookings.status, "cancelled")));
  const first = future.find((f) => f.b.id === bk.id);
  const coachTz = await tzOf(bk.coachId);
  await notifyBoth(userId, bk.coachId, `cancel:${bk.id}:${scope}`, "Check-in cancelled",
    scope === "series" ? "Your upcoming coach check-ins were cancelled." : `Your check-in on ${first ? when(first.startsAt, timezone) : "that date"} was cancelled.`,
    `${user.name.split(" ")[0]} cancelled ${scope === "series" ? "all upcoming check-ins" : `the check-in on ${first ? when(first.startsAt, coachTz) : "that date"}`}.`);
  await track("pro_booking_cancelled", userId, { scope, count: ids.length });
  return ids.length;
}
