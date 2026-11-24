import { describe, expect, it } from "vitest";
import { LEN, mix, rig, solve } from "@/lib/figure/rig";
import { TEMPLATES } from "@/lib/figure/templates";

const dist = (a: [number, number], b: [number, number]) => Math.hypot(a[0] - b[0], a[1] - b[1]);

describe("figure rig", () => {
  it("keeps limb lengths constant (IK)", () => {
    const r = solve([0, 0], [10, 20], 15, 14, 1);
    expect(dist([0, 0], r.mid)).toBeCloseTo(15, 5);
    expect(dist(r.mid, r.end)).toBeCloseTo(14, 5);
  });
  it("clamps unreachable targets instead of stretching limbs", () => {
    const r = solve([0, 0], [100, 0], 15, 14, 1);
    expect(dist([0, 0], r.end)).toBeLessThanOrEqual(29);
  });
  it("produces finite joints for every template across the movement", () => {
    for (const [name, t] of Object.entries(TEMPLATES)) {
      for (const k of [0, 0.25, 0.5, 0.75, 1]) {
        const j = rig(mix(t.start, t.end, k), { spread: t.spread ?? 0 });
        for (const p of Object.values(j)) expect(Number.isFinite(p[0]) && Number.isFinite(p[1]), name).toBe(true);
        expect(dist(j.shoulder, j.elbow), name).toBeCloseTo(LEN.upper, 3);
        expect(dist(j.hip, j.knee), name).toBeCloseTo(LEN.thigh, 3);
      }
    }
  });
  it("doesn't flip the body mid-movement (torso angle changes < 120°)", () => {
    for (const [name, t] of Object.entries(TEMPLATES)) expect(Math.abs(t.end.torso - t.start.torso), name).toBeLessThan(120);
  });
});
