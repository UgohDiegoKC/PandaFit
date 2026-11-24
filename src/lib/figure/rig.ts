/**
 * Tiny 2-D mannequin rig for exercise form illustrations (original artwork, drawn in code).
 * A pose places the hips, tilts the torso, and puts hands/feet at target points;
 * elbows and knees are solved with 2-link inverse kinematics so limbs keep their length.
 * Coordinates: 100×100 box, y grows downward, angles in degrees (0 = facing right, -90 = up).
 */

export type P = [number, number];

export const LEN = { torso: 27, neck: 5, head: 6, upper: 15, fore: 14, thigh: 23, shin: 23 } as const;

export interface Pose {
  hip: P;
  torso: number;
  hand: P;
  foot: P;
  hand2?: P;
  foot2?: P;
  /** +1 / -1 chooses which side the elbow/knee bends to. */
  elbow?: 1 | -1;
  knee?: 1 | -1;
  elbow2?: 1 | -1;
  knee2?: 1 | -1;
}

export interface Joints {
  hip: P; hip2: P; shoulder: P; shoulder2: P; head: P;
  elbow: P; hand: P; elbow2: P; hand2: P;
  knee: P; foot: P; knee2: P; foot2: P;
}

const rad = (d: number) => (d * Math.PI) / 180;
const add = (a: P, b: P): P => [a[0] + b[0], a[1] + b[1]];
const polar = (len: number, deg: number): P => [len * Math.cos(rad(deg)), len * Math.sin(rad(deg))];

/** Two-link IK: returns the middle joint and the (possibly clamped) end point. */
export function solve(base: P, target: P, l1: number, l2: number, bend: 1 | -1): { mid: P; end: P } {
  const dx = target[0] - base[0], dy = target[1] - base[1];
  const raw = Math.hypot(dx, dy) || 0.001;
  const d = Math.min(l1 + l2 - 0.01, Math.max(Math.abs(l1 - l2) + 0.01, raw));
  const a = Math.atan2(dy, dx);
  const cosT = Math.min(1, Math.max(-1, (l1 * l1 + d * d - l2 * l2) / (2 * l1 * d)));
  const t = Math.acos(cosT) * bend;
  const mid: P = [base[0] + l1 * Math.cos(a + t), base[1] + l1 * Math.sin(a + t)];
  const end: P = [base[0] + d * Math.cos(a), base[1] + d * Math.sin(a)];
  return { mid, end };
}

export interface RigOpts { spread?: number }

/** spread > 0 draws a front view (limbs mirrored either side); 0 = side view. */
export function rig(p: Pose, { spread = 0 }: RigOpts = {}): Joints {
  const shoulderC = add(p.hip, polar(LEN.torso, p.torso));
  const head = add(shoulderC, polar(LEN.neck + LEN.head, p.torso));
  const s = spread;
  const shoulder: P = [shoulderC[0] + s, shoulderC[1]];
  const shoulder2: P = [shoulderC[0] - s, shoulderC[1]];
  const hip: P = [p.hip[0] + s * 0.6, p.hip[1]];
  const hip2: P = [p.hip[0] - s * 0.6, p.hip[1]];
  const arm = solve(shoulder, p.hand, LEN.upper, LEN.fore, p.elbow ?? 1);
  const arm2 = solve(shoulder2, p.hand2 ?? (s ? [2 * shoulderC[0] - p.hand[0], p.hand[1]] : p.hand), LEN.upper, LEN.fore, p.elbow2 ?? (s ? (-(p.elbow ?? 1) as 1 | -1) : p.elbow ?? 1));
  const leg = solve(hip, p.foot, LEN.thigh, LEN.shin, p.knee ?? -1);
  const leg2 = solve(hip2, p.foot2 ?? (s ? [2 * p.hip[0] - p.foot[0], p.foot[1]] : p.foot), LEN.thigh, LEN.shin, p.knee2 ?? (s ? (-(p.knee ?? -1) as 1 | -1) : p.knee ?? -1));
  return {
    hip, hip2, shoulder, shoulder2, head,
    elbow: arm.mid, hand: arm.end, elbow2: arm2.mid, hand2: arm2.end,
    knee: leg.mid, foot: leg.end, knee2: leg2.mid, foot2: leg2.end,
  };
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const lerpP = (a: P, b: P, t: number): P => [lerp(a[0], b[0], t), lerp(a[1], b[1], t)];
const opt = (a: P | undefined, b: P | undefined, t: number) => (a && b ? lerpP(a, b, t) : a ?? b);

export function mix(a: Pose, b: Pose, t: number): Pose {
  return {
    ...a,
    hip: lerpP(a.hip, b.hip, t),
    torso: lerp(a.torso, b.torso, t),
    hand: lerpP(a.hand, b.hand, t),
    foot: lerpP(a.foot, b.foot, t),
    hand2: opt(a.hand2, b.hand2, t),
    foot2: opt(a.foot2, b.foot2, t),
  };
}
