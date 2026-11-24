import { beforeEach, describe, expect, it } from "vitest";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { BookingError, bookSeries, cancelBooking, createSlots, deleteSlot, openSlots, rescheduleBooking, setSlotBlocked } from "@/lib/coach";
import { makeUser, resetDb } from "./helpers";

const now = new Date("2026-11-23T08:00:00Z");
const TZ = "Africa/Lagos";

describe("coach booking (integration)", () => {
  let coach: string, member: string, other: string;
  beforeEach(async () => {
    await resetDb();
    coach = await makeUser({ role: "coach" });
    member = await makeUser({ isPro: true });
    other = await makeUser({ isPro: true });
  });

  const slotAt = async (iso: string) => (await db.query.coachSlots.findFirst({ where: eq(schema.coachSlots.startsAt, new Date(iso)) }))!;

  it("creates weekly slots and refuses overlaps", async () => {
    const a = await createSlots({ coachId: coach, date: "2026-11-24", startMin: 18 * 60, durationMin: 30, repeatWeeks: 3, timezone: TZ }, now);
    expect(a.created).toHaveLength(4);
    const b = await createSlots({ coachId: coach, date: "2026-11-24", startMin: 18 * 60 + 15, durationMin: 30, repeatWeeks: 0, timezone: TZ }, now);
    expect(b.created).toHaveLength(0);
    expect(b.conflicts).toHaveLength(1);
  });

  it("books a weekly series and reports missing dates", async () => {
    await createSlots({ coachId: coach, date: "2026-11-24", startMin: 18 * 60, durationMin: 30, repeatWeeks: 2, timezone: TZ }, now); // 3 weeks only
    const first = await slotAt("2026-11-24T17:00:00Z");
    const r = await bookSeries(member, first.id, "weekly", TZ, now);
    expect(r.booked).toHaveLength(3);
    expect(r.unavailable).toHaveLength(1);
  });

  it("prevents double-booking the same slot (database-enforced)", async () => {
    await createSlots({ coachId: coach, date: "2026-11-24", startMin: 18 * 60, durationMin: 30, repeatWeeks: 0, timezone: TZ }, now);
    const s = await slotAt("2026-11-24T17:00:00Z");
    await bookSeries(member, s.id, "weekly", TZ, now);
    await expect(bookSeries(other, s.id, "weekly", TZ, now)).rejects.toThrow(BookingError);
    await expect(db.insert(schema.proBookings).values({ userId: other, coachId: coach, slotId: s.id, seriesId: "x", cadence: "weekly" })).rejects.toThrow();
  });

  it("requires Pro", async () => {
    const free = await makeUser({});
    await createSlots({ coachId: coach, date: "2026-11-24", startMin: 18 * 60, durationMin: 30, repeatWeeks: 0, timezone: TZ }, now);
    await expect(bookSeries(free, (await slotAt("2026-11-24T17:00:00Z")).id, "weekly", TZ, now)).rejects.toThrow(/Pro/);
  });

  it("enforces minimum notice", async () => {
    await createSlots({ coachId: coach, date: "2026-11-23", startMin: 10 * 60, durationMin: 30, repeatWeeks: 0, timezone: TZ }, new Date("2026-11-23T07:00:00Z"));
    await expect(bookSeries(member, (await slotAt("2026-11-23T09:00:00Z")).id, "weekly", TZ, now)).rejects.toThrow(/2 hours/);
  });

  it("hides booked and blocked slots, and protects booked slots from block/delete", async () => {
    await createSlots({ coachId: coach, date: "2026-11-24", startMin: 18 * 60, durationMin: 30, repeatWeeks: 0, timezone: TZ }, now);
    await createSlots({ coachId: coach, date: "2026-11-24", startMin: 19 * 60, durationMin: 30, repeatWeeks: 0, timezone: TZ }, now);
    const a = await slotAt("2026-11-24T17:00:00Z"), b = await slotAt("2026-11-24T18:00:00Z");
    await bookSeries(member, a.id, "biweekly", TZ, now);
    await setSlotBlocked(coach, b.id, true);
    expect((await openSlots(now)).map((s) => s.id)).toEqual([]);
    await expect(setSlotBlocked(coach, a.id, true)).rejects.toThrow(/booked/);
    await expect(deleteSlot(coach, a.id)).rejects.toThrow(/booked/);
  });

  it("reschedules and cancels, freeing slots", async () => {
    await createSlots({ coachId: coach, date: "2026-11-24", startMin: 18 * 60, durationMin: 30, repeatWeeks: 1, timezone: TZ }, now);
    await createSlots({ coachId: coach, date: "2026-11-25", startMin: 18 * 60, durationMin: 30, repeatWeeks: 0, timezone: TZ }, now);
    const a = await slotAt("2026-11-24T17:00:00Z"), c = await slotAt("2026-11-25T17:00:00Z");
    await bookSeries(member, a.id, "weekly", TZ, now);
    const bk = (await db.query.proBookings.findFirst({ where: and(eq(schema.proBookings.slotId, a.id), eq(schema.proBookings.status, "confirmed")) }))!;
    await rescheduleBooking(member, bk.id, c.id, TZ, now);
    expect((await openSlots(now)).map((s) => s.id)).toContain(a.id);
    const moved = (await db.query.proBookings.findFirst({ where: and(eq(schema.proBookings.slotId, c.id), eq(schema.proBookings.status, "confirmed")) }))!;
    expect(await cancelBooking(member, moved.id, "series", TZ, now)).toBe(2);
    expect((await openSlots(now))).toHaveLength(3);
  });

  it("queues confirmations for both member and coach", async () => {
    await createSlots({ coachId: coach, date: "2026-11-24", startMin: 18 * 60, durationMin: 30, repeatWeeks: 0, timezone: TZ }, now);
    await bookSeries(member, (await slotAt("2026-11-24T17:00:00Z")).id, "weekly", TZ, now);
    const q = await db.select().from(schema.notifications).where(eq(schema.notifications.kind, "booking_update"));
    expect(new Set(q.map((n) => n.userId))).toEqual(new Set([member, coach]));
  });
});
