/**
 * Movement templates: a start and finish pose for each movement pattern, plus equipment
 * and the body segments to highlight. Exercises map onto templates in EXERCISE_FIGURE.
 * All artwork is original, drawn from these coordinates.
 */
import type { P, Pose } from "./rig";

export type Seg = "torso" | "upper" | "fore" | "thigh" | "shin";
export type Joint = "hand" | "foot" | "hip" | "shoulder" | "knee";

export type Weight = "barbell" | "dumbbell" | "kettlebell" | "handle" | "rope" | "bar";

export type Prop =
  | { k: "bench" | "seat" | "rail"; from: P; to: P; legs?: boolean }
  | { k: "line"; from: P; to: P; w?: number }
  | { k: "step"; x: number; w: number; h: number }
  | { k: "pullbar"; from: P; to: P }
  | { k: "cable"; anchor: P; to?: Joint }
  | { k: "platform"; at: Joint; angle: number }
  | { k: "pad"; at: Joint; offset?: P }
  | { k: "wheel"; c: P; r: number };

export interface Template {
  start: Pose;
  end: Pose;
  accent: Seg[];
  weight?: { kind: Weight; at: Joint; offset?: P; both?: boolean };
  props?: Prop[];
  /** Front view: limbs mirrored either side of the body. */
  spread?: number;
  floor?: boolean;
  /** Which frame to use for static thumbnails (0 = start, 1 = finish). */
  thumb?: number;
}

const stand = { hip: [50, 48] as P, torso: -90, foot: [52, 94] as P };

export const TEMPLATES: Record<string, Template> = {
  // ── Lower body
  squat: {
    start: { ...stand, torso: -88, hand: [61, 30], elbow: 1 },
    end: { hip: [38, 70], torso: -58, foot: [52, 94], hand: [62, 50], elbow: 1 },
    accent: ["thigh", "shin"], weight: { kind: "kettlebell", at: "hand", offset: [2, 4] },
  },
  backSquat: {
    start: { ...stand, torso: -88, hand: [44, 23], elbow: -1 },
    end: { hip: [38, 70], torso: -55, foot: [52, 94], hand: [47, 47], elbow: -1 },
    accent: ["thigh", "shin"], weight: { kind: "barbell", at: "shoulder", offset: [-5, 3] },
  },
  legPress: {
    start: { hip: [32, 72], torso: -152, foot: [52, 50], hand: [36, 74], knee: -1, elbow: 1 },
    end: { hip: [32, 72], torso: -152, foot: [72, 46], hand: [36, 74], knee: -1, elbow: 1 },
    accent: ["thigh", "shin"],
    props: [{ k: "seat", from: [4, 58], to: [42, 78], legs: true }, { k: "platform", at: "foot", angle: -60 }],
  },
  lunge: {
    start: { hip: [48, 50], torso: -90, foot: [64, 94], foot2: [32, 94], hand: [48, 77], knee2: -1 },
    end: { hip: [46, 66], torso: -88, foot: [66, 94], foot2: [28, 94], hand: [47, 93], knee2: -1 },
    accent: ["thigh", "shin"], weight: { kind: "dumbbell", at: "hand" }, thumb: 1,
  },
  legExtension: {
    start: { hip: [40, 64], torso: -95, foot: [62, 88], hand: [40, 68], knee: 1, elbow: 1 },
    end: { hip: [40, 64], torso: -95, foot: [84, 58], hand: [40, 68], knee: 1, elbow: 1 },
    accent: ["thigh"],
    props: [{ k: "seat", from: [24, 67], to: [62, 67], legs: true }, { k: "line", from: [26, 66], to: [22, 36], w: 4 }, { k: "pad", at: "foot", offset: [1, 2] }],
  },
  legCurl: {
    start: { hip: [40, 64], torso: -95, foot: [84, 60], hand: [40, 68], knee: 1, elbow: 1 },
    end: { hip: [40, 64], torso: -95, foot: [58, 90], hand: [40, 68], knee: 1, elbow: 1 },
    accent: ["thigh"],
    props: [{ k: "seat", from: [24, 67], to: [62, 67], legs: true }, { k: "line", from: [26, 66], to: [22, 36], w: 4 }, { k: "pad", at: "foot", offset: [0, -3] }],
  },
  rdl: {
    start: { ...stand, foot: [54, 94], hand: [50, 75], elbow: 1 },
    end: { hip: [40, 52], torso: -14, foot: [54, 94], hand: [64, 78], elbow: 1 },
    accent: ["thigh"], weight: { kind: "dumbbell", at: "hand" },
  },
  deadlift: {
    start: { hip: [40, 66], torso: -32, foot: [56, 94], hand: [62, 84], elbow: 1 },
    end: { ...stand, foot: [56, 94], hand: [52, 76], elbow: 1 },
    accent: ["thigh", "torso"], weight: { kind: "barbell", at: "hand", offset: [0, 2] }, thumb: 0,
  },
  hipThrust: {
    start: { hip: [52, 86], torso: 200, foot: [72, 94], hand: [54, 82], elbow: -1 },
    end: { hip: [48, 70], torso: 178, foot: [72, 94], hand: [50, 66], elbow: -1 },
    accent: ["thigh"], weight: { kind: "barbell", at: "hip", offset: [1, -6] },
    props: [{ k: "bench", from: [2, 78], to: [27, 78], legs: true }],
  },
  calfRaise: {
    start: { hip: [50, 44], torso: -90, foot: [54, 88], hand: [50, 71], elbow: 1 },
    end: { hip: [50, 38], torso: -90, foot: [54, 82], hand: [50, 65], elbow: 1 },
    accent: ["shin"], props: [{ k: "step", x: 46, w: 20, h: 6 }],
  },

  // ── Push
  bench: {
    start: { hip: [62, 70], torso: 180, foot: [80, 94], hand: [37, 58], knee: 1, elbow: -1 },
    end: { hip: [62, 70], torso: 180, foot: [80, 94], hand: [35, 42], knee: 1, elbow: -1 },
    accent: ["torso", "upper"], weight: { kind: "barbell", at: "hand" },
    props: [{ k: "bench", from: [12, 74], to: [66, 74], legs: true }],
  },
  incline: {
    start: { hip: [60, 74], torso: -150, foot: [80, 94], hand: [40, 54], knee: -1, elbow: -1 },
    end: { hip: [60, 74], torso: -150, foot: [80, 94], hand: [44, 33], knee: -1, elbow: -1 },
    accent: ["torso", "upper"], weight: { kind: "dumbbell", at: "hand" },
    props: [{ k: "bench", from: [62, 78], to: [18, 52], legs: true }],
  },
  chestPress: {
    start: { hip: [36, 66], torso: -92, foot: [56, 94], hand: [44, 44], elbow: 1 },
    end: { hip: [36, 66], torso: -92, foot: [56, 94], hand: [63, 41], elbow: 1 },
    accent: ["torso", "upper"], weight: { kind: "handle", at: "hand" },
    props: [{ k: "seat", from: [24, 68], to: [50, 68], legs: true }, { k: "line", from: [28, 67], to: [27, 30], w: 4 }],
  },
  pushUp: {
    start: { hip: [44, 76], torso: -17, foot: [0, 93], hand: [72, 94], elbow: 1, knee: 1 },
    end: { hip: [44, 84], torso: -6, foot: [0, 93], hand: [72, 94], elbow: 1, knee: 1 },
    accent: ["torso", "upper"], thumb: 0,
  },
  fly: {
    start: { hip: [48, 48], torso: -86, foot: [58, 94], foot2: [40, 94], hand: [28, 24], elbow: -1 },
    end: { hip: [48, 48], torso: -86, foot: [58, 94], foot2: [40, 94], hand: [74, 30], elbow: 1 },
    accent: ["torso"], weight: { kind: "handle", at: "hand" }, props: [{ k: "cable", anchor: [2, 18] }],
  },
  seatedPress: {
    start: { hip: [44, 66], torso: -90, foot: [64, 94], hand: [52, 38], elbow: -1 },
    end: { hip: [44, 66], torso: -90, foot: [64, 94], hand: [47, 11], elbow: -1 },
    accent: ["upper"], weight: { kind: "dumbbell", at: "hand" },
    props: [{ k: "seat", from: [30, 68], to: [56, 68], legs: true }, { k: "line", from: [37, 67], to: [36, 36], w: 4 }],
  },
  ohp: {
    start: { ...stand, hand: [57, 22], elbow: -1 },
    end: { ...stand, hand: [52, -7], elbow: -1 },
    accent: ["upper"], weight: { kind: "barbell", at: "hand" },
  },
  lateral: {
    start: { ...stand, foot: [56, 94], hand: [61, 50], elbow: -1 },
    end: { ...stand, foot: [56, 94], hand: [82, 24], elbow: -1 },
    accent: ["upper"], weight: { kind: "dumbbell", at: "hand", both: true }, spread: 7,
  },
  cableLateral: {
    start: { ...stand, foot: [56, 94], hand: [56, 52], hand2: [38, 48], elbow: -1, elbow2: 1 },
    end: { ...stand, foot: [56, 94], hand: [82, 24], hand2: [38, 48], elbow: -1, elbow2: 1 },
    accent: ["upper"], weight: { kind: "handle", at: "hand" }, spread: 7, props: [{ k: "cable", anchor: [30, 94] }],
  },
  pushdown: {
    start: { ...stand, torso: -82, foot: [54, 94], hand: [66, 34], elbow: 1 },
    end: { ...stand, torso: -82, foot: [54, 94], hand: [59, 49], elbow: 1 },
    accent: ["upper"], weight: { kind: "rope", at: "hand" }, props: [{ k: "cable", anchor: [80, -10] }],
  },
  skullCrusher: {
    start: { hip: [62, 70], torso: 180, foot: [80, 94], hand: [24, 54], knee: 1, elbow: 1 },
    end: { hip: [62, 70], torso: 180, foot: [80, 94], hand: [35, 42], knee: 1, elbow: 1 },
    accent: ["upper"], weight: { kind: "barbell", at: "hand" },
    props: [{ k: "bench", from: [12, 74], to: [66, 74], legs: true }],
  },
  curl: {
    start: { ...stand, hand: [51, 76], elbow: 1 },
    end: { ...stand, hand: [60, 30], elbow: 1 },
    accent: ["upper", "fore"], weight: { kind: "dumbbell", at: "hand" },
  },
  cableCurl: {
    start: { ...stand, hand: [53, 76], elbow: 1 },
    end: { ...stand, hand: [60, 30], elbow: 1 },
    accent: ["upper", "fore"], weight: { kind: "bar", at: "hand" }, props: [{ k: "cable", anchor: [84, 93] }],
  },

  // ── Pull
  pulldown: {
    start: { hip: [42, 66], torso: -95, foot: [62, 94], hand: [53, 10], elbow: -1 },
    end: { hip: [42, 66], torso: -98, foot: [62, 94], hand: [50, 40], elbow: 1 },
    accent: ["torso", "upper"], weight: { kind: "bar", at: "hand" },
    props: [{ k: "seat", from: [28, 68], to: [54, 68], legs: true }, { k: "pad", at: "knee", offset: [2, -5] }, { k: "cable", anchor: [52, -12] }],
  },
  pullUp: {
    start: { hip: [46, 64], torso: -90, foot: [34, 102], hand: [70, 8], knee: 1, elbow: 1 },
    end: { hip: [52, 44], torso: -88, foot: [40, 82], hand: [70, 8], knee: 1, elbow: 1 },
    accent: ["torso", "upper"], props: [{ k: "pullbar", from: [36, 6], to: [96, 6] }], floor: false, thumb: 1,
  },
  cableRow: {
    start: { hip: [28, 80], torso: -68, foot: [70, 86], hand: [68, 66], knee: -1, elbow: 1 },
    end: { hip: [28, 80], torso: -96, foot: [70, 86], hand: [42, 70], knee: -1, elbow: 1 },
    accent: ["torso", "upper"], weight: { kind: "handle", at: "hand" },
    props: [{ k: "seat", from: [10, 83], to: [44, 83], legs: true }, { k: "cable", anchor: [100, 72] }, { k: "line", from: [74, 78], to: [74, 94], w: 3 }],
  },
  supportedRow: {
    start: { hip: [34, 70], torso: -40, foot: [28, 94], hand: [58, 82], elbow: 1, knee: -1 },
    end: { hip: [34, 70], torso: -40, foot: [28, 94], hand: [48, 66], elbow: 1, knee: -1 },
    accent: ["torso", "upper"], weight: { kind: "dumbbell", at: "hand" },
    props: [{ k: "bench", from: [30, 78], to: [62, 56], legs: true }],
  },
  barbellRow: {
    start: { hip: [42, 56], torso: -20, foot: [56, 94], hand: [66, 78], elbow: 1 },
    end: { hip: [42, 56], torso: -20, foot: [56, 94], hand: [56, 64], elbow: 1 },
    accent: ["torso", "upper"], weight: { kind: "barbell", at: "hand" },
  },
  facePull: {
    start: { ...stand, torso: -88, hand: [78, 24], elbow: -1 },
    end: { ...stand, torso: -92, hand: [60, 12], elbow: 1 },
    accent: ["upper"], weight: { kind: "rope", at: "hand" }, props: [{ k: "cable", anchor: [100, 16] }],
  },

  // ── Core
  plank: {
    start: { hip: [44, 78], torso: -8, foot: [6, 92], hand: [84, 93], elbow: 1, knee: 1 },
    end: { hip: [44, 76], torso: -9, foot: [6, 92], hand: [84, 93], elbow: 1, knee: 1 },
    accent: ["torso"],
  },
  deadBug: {
    start: { hip: [56, 84], torso: 180, foot: [76, 62], foot2: [76, 62], hand: [30, 56], hand2: [30, 56], knee: 1, knee2: 1, elbow: 1, elbow2: 1 },
    end: { hip: [56, 84], torso: 180, foot: [100, 80], foot2: [76, 62], hand: [2, 80], hand2: [30, 56], knee: 1, knee2: 1, elbow: 1, elbow2: 1 },
    accent: ["torso"],
  },
  cableCrunch: {
    start: { hip: [48, 66], torso: -85, foot: [24, 94], hand: [56, 28], knee: -1, elbow: -1 },
    end: { hip: [48, 66], torso: -18, foot: [24, 94], hand: [78, 44], knee: -1, elbow: -1 },
    accent: ["torso"], weight: { kind: "rope", at: "hand" }, props: [{ k: "cable", anchor: [62, -12] }],
  },
  pallof: {
    start: { ...stand, foot: [56, 94], foot2: [44, 94], hand: [62, 40], elbow: 1 },
    end: { ...stand, foot: [56, 94], foot2: [44, 94], hand: [78, 38], elbow: 1 },
    accent: ["torso"], weight: { kind: "handle", at: "hand" }, props: [{ k: "cable", anchor: [2, 40] }],
  },

  // ── Conditioning
  rower: {
    start: { hip: [30, 82], torso: -62, foot: [66, 84], hand: [70, 70], knee: -1, elbow: 1 },
    end: { hip: [16, 82], torso: -108, foot: [66, 84], hand: [26, 64], knee: -1, elbow: 1 },
    accent: ["thigh", "torso"], weight: { kind: "handle", at: "hand" },
    props: [{ k: "rail", from: [2, 86], to: [80, 86], legs: true }, { k: "cable", anchor: [92, 72] }, { k: "platform", at: "foot", angle: -75 }],
  },
  bike: {
    start: { hip: [40, 52], torso: -55, foot: [54, 94], foot2: [62, 74], hand: [72, 42], elbow: 1, knee: -1, knee2: -1 },
    end: { hip: [40, 52], torso: -55, foot: [62, 74], foot2: [54, 94], hand: [72, 42], elbow: 1, knee: -1, knee2: -1 },
    accent: ["thigh", "shin"],
    props: [{ k: "line", from: [34, 56], to: [46, 56], w: 4 }, { k: "line", from: [40, 56], to: [56, 84], w: 3 }, { k: "line", from: [56, 84], to: [74, 44], w: 3 }, { k: "wheel", c: [57, 84], r: 9 }],
  },
};

/** Which template draws each catalog exercise (and optional equipment override). */
export const EXERCISE_FIGURE: Record<string, { t: keyof typeof TEMPLATES; weight?: Weight | null }> = {
  "barbell-bench-press": { t: "bench" },
  "dumbbell-bench-press": { t: "bench", weight: "dumbbell" },
  "incline-dumbbell-press": { t: "incline" },
  "machine-chest-press": { t: "chestPress" },
  "push-up": { t: "pushUp" },
  "cable-fly": { t: "fly" },
  "dumbbell-shoulder-press": { t: "seatedPress" },
  "machine-shoulder-press": { t: "seatedPress", weight: "handle" },
  "barbell-overhead-press": { t: "ohp" },
  "lateral-raise": { t: "lateral" },
  "cable-lateral-raise": { t: "cableLateral" },
  "triceps-pushdown": { t: "pushdown" },
  "ez-bar-lying-triceps-extension": { t: "skullCrusher" },
  "dumbbell-curl": { t: "curl" },
  "cable-curl": { t: "cableCurl" },
  "hammer-curl": { t: "curl" },
  "lat-pulldown": { t: "pulldown" },
  "assisted-pull-up": { t: "pullUp" },
  "pull-up": { t: "pullUp" },
  "seated-cable-row": { t: "cableRow" },
  "chest-supported-row": { t: "supportedRow" },
  "barbell-row": { t: "barbellRow" },
  "face-pull": { t: "facePull" },
  "goblet-squat": { t: "squat" },
  "barbell-back-squat": { t: "backSquat" },
  "leg-press": { t: "legPress" },
  "walking-lunge": { t: "lunge" },
  "split-squat": { t: "lunge", weight: null },
  "leg-extension": { t: "legExtension" },
  "romanian-deadlift": { t: "rdl" },
  "barbell-deadlift": { t: "deadlift" },
  "hip-thrust": { t: "hipThrust" },
  "leg-curl": { t: "legCurl" },
  "calf-raise": { t: "calfRaise" },
  "plank": { t: "plank" },
  "dead-bug": { t: "deadBug" },
  "cable-crunch": { t: "cableCrunch" },
  "pallof-press": { t: "pallof" },
  "rower-intervals": { t: "rower" },
  "bike-intervals": { t: "bike" },
};
