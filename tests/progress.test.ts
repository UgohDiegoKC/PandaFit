import { describe, expect, it } from "vitest";
import { activityGrid, detectPRs, estimate1RM, weeklyStreak, weekStart } from "@/lib/progress";

const d = (s: string) => new Date(s + "T12:00:00Z");

describe("weekStart", () => {
  it("returns the Monday of the week", () => {
    expect(weekStart(d("2026-11-24"))).toBe("2026-11-23"); // Tuesday → Monday
    expect(weekStart(d("2026-11-29"))).toBe("2026-11-23"); // Sunday → previous Monday
  });
});

describe("weeklyStreak", () => {
  const now = d("2026-11-25");
  it("counts consecutive weeks with a workout", () => {
    expect(weeklyStreak([d("2026-11-24"), d("2026-11-17"), d("2026-11-10")], [], now)).toBe(3);
  });
  it("doesn't break the streak just because this week hasn't had a workout yet", () => {
    expect(weeklyStreak([d("2026-11-17"), d("2026-11-10")], [], now)).toBe(2);
  });
  it("breaks on a missed week", () => {
    expect(weeklyStreak([d("2026-11-24"), d("2026-11-03")], [], now)).toBe(1);
  });
  it("treats break weeks as paused, not missed", () => {
    const breaks = [{ startsOn: "2026-11-16", endsOn: "2026-11-22" }];
    expect(weeklyStreak([d("2026-11-24"), d("2026-11-10")], breaks, now)).toBe(2);
  });
  it("respects a break that was ended early", () => {
    const breaks = [{ startsOn: "2026-11-16", endsOn: "2026-11-22", endedEarlyOn: "2026-11-16" }];
    expect(weeklyStreak([d("2026-11-24"), d("2026-11-10")], breaks, now)).toBe(1);
  });
});

describe("detectPRs", () => {
  const set = (weightKg: number, reps: number, completed = true) => ({ exerciseSlug: "goblet-squat", weightKg, reps, completed });

  it("sets a silent baseline the first time an exercise is logged", () => {
    const { records, baselines } = detectPRs([set(20, 10)], []);
    expect(records).toHaveLength(0);
    expect(baselines.map((b) => b.kind).sort()).toEqual(["est_1rm", "max_weight"]);
  });
  it("celebrates a heavier weight once per session", () => {
    const { records } = detectPRs([set(30, 8), set(32, 6), set(32, 5)], [{ exerciseSlug: "goblet-squat", kind: "max_weight", value: 28 }]);
    const w = records.filter((r) => r.kind === "max_weight");
    expect(w).toHaveLength(1);
    expect(w[0]).toMatchObject({ value: 32, previous: 28, reps: 6 });
  });
  it("ignores incomplete and implausible sets", () => {
    const { records } = detectPRs([set(100, 5, false), set(900, 1)], [{ exerciseSlug: "goblet-squat", kind: "max_weight", value: 28 }]);
    expect(records).toHaveLength(0);
  });
  it("tracks max reps for bodyweight work", () => {
    const { records } = detectPRs([{ exerciseSlug: "push-up", weightKg: 0, reps: 25, completed: true }], [{ exerciseSlug: "push-up", kind: "max_reps", value: 20 }]);
    expect(records[0]).toMatchObject({ kind: "max_reps", value: 25 });
  });
  it("uses Epley for estimated 1RM", () => {
    expect(estimate1RM(100, 1)).toBe(100);
    expect(estimate1RM(100, 10)).toBeCloseTo(133.3, 1);
  });
});

describe("activityGrid", () => {
  it("returns weeks × 7 days and marks active days", () => {
    const g = activityGrid([d("2026-11-24")], 4, d("2026-11-25"));
    expect(g).toHaveLength(4);
    expect(g.every((w) => w.length === 7)).toBe(true);
    expect(g.flat().find((c) => c.date === "2026-11-24")?.active).toBe(true);
    expect(g.flat().find((c) => c.date === "2026-11-29")?.future).toBe(true);
  });
});
