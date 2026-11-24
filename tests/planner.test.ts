import { describe, expect, it } from "vitest";
import { desiredReminders, type PlannerPrefs } from "@/lib/notify/planner";

const prefs: PlannerPrefs = { timezone: "Africa/Lagos", gymReminders: true, gymTimeMin: 18 * 60, gymLeadMin: 60, breakReminders: true, checkinReminders: true };
const base = { userId: "u1", gymWeekdays: [1, 3, 5], breaks: [], bookings: [] };
const now = new Date("2026-11-23T08:00:00Z"); // Monday 09:00 Lagos

describe("desiredReminders", () => {
  it("schedules gym reminders before the usual workout time on gym days within 48h", () => {
    const r = desiredReminders(now, prefs, base).filter((x) => x.kind === "gym_prep");
    expect(r.map((x) => x.dedupeKey)).toEqual(["gym:u1:2026-11-23"]); // Wednesday is >48h away
    expect(r[0].sendAt.toISOString()).toBe("2026-11-23T16:00:00.000Z"); // 17:00 Lagos
    expect(r[0].expiresAt.toISOString()).toBe("2026-11-23T17:00:00.000Z");
    const evening = desiredReminders(new Date("2026-11-23T20:00:00Z"), prefs, base).map((x) => x.dedupeKey);
    expect(evening).toEqual(["gym:u1:2026-11-25"]); // Monday's session has passed
  });
  it("skips gym reminders on break days", () => {
    const r = desiredReminders(now, { ...prefs, breakReminders: false }, { ...base, breaks: [{ id: "b", startsOn: "2026-11-20", endsOn: "2026-11-24" }] });
    expect(r.filter((x) => x.kind === "gym_prep")).toHaveLength(0);
  });
  it("reminds two days before a break ends, keyed to the end date", () => {
    const r = desiredReminders(now, prefs, { ...base, gymWeekdays: [], breaks: [{ id: "b", startsOn: "2026-11-16", endsOn: "2026-11-25" }] });
    expect(r).toHaveLength(1);
    expect(r[0]).toMatchObject({ kind: "break_ending", dedupeKey: "break:b:2026-11-25" });
    expect(r[0].sendAt.toISOString()).toBe("2026-11-23T08:00:00.000Z"); // 09:00 Lagos on the 23rd
  });
  it("drops the break reminder once the break was ended early", () => {
    const r = desiredReminders(now, prefs, { ...base, gymWeekdays: [], breaks: [{ id: "b", startsOn: "2026-11-16", endsOn: "2026-11-25", endedEarlyOn: "2026-11-20" }] });
    expect(r).toHaveLength(0);
  });
  it("reminds 24h before confirmed check-ins only", () => {
    const startsAt = new Date("2026-11-24T17:00:00Z");
    const r = desiredReminders(now, prefs, { ...base, gymWeekdays: [], bookings: [{ id: "k1", startsAt, status: "confirmed" }, { id: "k2", startsAt, status: "cancelled" }] });
    expect(r.map((x) => x.dedupeKey)).toEqual([`checkin:k1:${startsAt.getTime()}`]);
  });
  it("respects per-type opt-outs", () => {
    expect(desiredReminders(now, { ...prefs, gymReminders: false }, base)).toHaveLength(0);
  });
});
