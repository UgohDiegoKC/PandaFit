import { describe, expect, it } from "vitest";
import { addDays, deferPastQuietHours, inWindow, localParts, zonedToUtc } from "@/lib/tz";

describe("timezones", () => {
  it("converts local wall time to UTC (Lagos, no DST)", () => {
    expect(zonedToUtc("2026-11-24", 18 * 60, "Africa/Lagos").toISOString()).toBe("2026-11-24T17:00:00.000Z");
  });
  it("handles DST in New York", () => {
    expect(zonedToUtc("2026-07-01", 9 * 60, "America/New_York").toISOString()).toBe("2026-07-01T13:00:00.000Z");
    expect(zonedToUtc("2026-12-01", 9 * 60, "America/New_York").toISOString()).toBe("2026-12-01T14:00:00.000Z");
  });
  it("reads local parts", () => {
    const p = localParts(new Date("2026-11-24T23:30:00Z"), "Africa/Lagos");
    expect(p).toMatchObject({ date: "2026-11-25", hour: 0, minute: 30, weekday: 3 });
  });
  it("detects quiet windows that wrap midnight", () => {
    expect(inWindow(23 * 60, 22 * 60, 7 * 60)).toBe(true);
    expect(inWindow(6 * 60, 22 * 60, 7 * 60)).toBe(true);
    expect(inWindow(12 * 60, 22 * 60, 7 * 60)).toBe(false);
  });
  it("defers to the end of quiet hours", () => {
    const at = new Date("2026-11-24T22:30:00Z"); // 23:30 Lagos
    expect(deferPastQuietHours(at, "Africa/Lagos", 22 * 60, 7 * 60).toISOString()).toBe("2026-11-25T06:00:00.000Z");
    const early = new Date("2026-11-25T04:00:00Z"); // 05:00 Lagos
    expect(deferPastQuietHours(early, "Africa/Lagos", 22 * 60, 7 * 60).toISOString()).toBe("2026-11-25T06:00:00.000Z");
    const noon = new Date("2026-11-25T11:00:00Z");
    expect(deferPastQuietHours(noon, "Africa/Lagos", 22 * 60, 7 * 60)).toBe(noon);
  });
  it("adds days across month ends", () => expect(addDays("2026-11-30", 2)).toBe("2026-12-02"));
});
