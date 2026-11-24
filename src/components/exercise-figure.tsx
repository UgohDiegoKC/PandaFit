import clsx from "clsx";
import { mix, rig, type Joints, type P } from "@/lib/figure/rig";
import { EXERCISE_FIGURE, TEMPLATES, type Joint, type Prop, type Seg, type Template, type Weight } from "@/lib/figure/templates";

/** Original mannequin illustrations of exercise form. Server-safe (no hooks). */

const FLOOR = 95;
const BODY = "var(--muted)";
const ACCENT = "var(--accent)";
const KIT = "var(--text)";
const PROP = "var(--border-strong)";

export function figureFor(slug: string): { template: Template; weight: Weight | null } | null {
  const m = EXERCISE_FIGURE[slug];
  if (!m) return null;
  const template = TEMPLATES[m.t];
  return { template, weight: m.weight === undefined ? template.weight?.kind ?? null : m.weight };
}

const at = (j: Joints, k: Joint, second = false): P =>
  k === "hand" ? (second ? j.hand2 : j.hand) : k === "foot" ? (second ? j.foot2 : j.foot) : k === "knee" ? (second ? j.knee2 : j.knee) : k === "hip" ? j.hip : j.shoulder;

function Line({ a, b, w, c, o = 1, dash }: { a: P; b: P; w: number; c: string; o?: number; dash?: string }) {
  return <line x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke={c} strokeWidth={w} strokeLinecap="round" opacity={o} strokeDasharray={dash} />;
}

function WeightShape({ kind, p }: { kind: Weight; p: P }) {
  const [x, y] = p;
  switch (kind) {
    case "barbell":
      return <g><circle cx={x} cy={y} r={7} fill={KIT} /><circle cx={x} cy={y} r={2} fill="var(--bg)" /></g>;
    case "dumbbell":
      return <g><circle cx={x} cy={y} r={3.8} fill={KIT} /><circle cx={x} cy={y} r={1.1} fill="var(--bg)" /></g>;
    case "kettlebell":
      return <g><circle cx={x} cy={y + 2.5} r={4.5} fill={KIT} /><path d={`M${x - 3},${y} a3,3 0 0 1 6,0`} stroke={KIT} strokeWidth={1.6} fill="none" /></g>;
    case "handle":
      return <rect x={x - 1.5} y={y - 3.5} width={3} height={7} rx={1.2} fill={KIT} />;
    case "rope":
      return <g stroke={KIT} strokeWidth={1.6} strokeLinecap="round"><line x1={x} y1={y - 2} x2={x - 1.5} y2={y + 5} /><line x1={x + 1} y1={y - 2} x2={x + 2.5} y2={y + 5} /></g>;
    case "bar":
      return <circle cx={x} cy={y} r={2.4} fill={KIT} />;
  }
}

function PropShape({ p, j }: { p: Prop; j: Joints }) {
  switch (p.k) {
    case "bench":
    case "seat":
    case "rail": {
      const inset = 4;
      const dx = p.to[0] - p.from[0], dy = p.to[1] - p.from[1], len = Math.hypot(dx, dy);
      const a: P = [p.from[0] + (dx / len) * inset, p.from[1] + (dy / len) * inset];
      const b: P = [p.to[0] - (dx / len) * inset, p.to[1] - (dy / len) * inset];
      return (
        <g>
          {p.legs && <><Line a={a} b={[a[0], FLOOR]} w={1.6} c={PROP} /><Line a={b} b={[b[0], FLOOR]} w={1.6} c={PROP} /></>}
          <Line a={p.from} b={p.to} w={5} c={PROP} />
        </g>
      );
    }
    case "line":
      return <Line a={p.from} b={p.to} w={p.w ?? 3} c={PROP} />;
    case "step":
      return <rect x={p.x} y={FLOOR - p.h} width={p.w} height={p.h} rx={1} fill={PROP} />;
    case "pullbar":
      return <Line a={p.from} b={p.to} w={3} c={KIT} />;
    case "cable": {
      const end = at(j, p.to ?? "hand");
      return <g><Line a={p.anchor} b={end} w={0.9} c={KIT} o={0.7} /><circle cx={p.anchor[0]} cy={p.anchor[1]} r={2.4} fill="none" stroke={KIT} strokeWidth={1.2} /></g>;
    }
    case "platform": {
      const c = at(j, p.at);
      const r = (p.angle * Math.PI) / 180, h = 10;
      return <Line a={[c[0] - Math.cos(r) * h + 2, c[1] - Math.sin(r) * h]} b={[c[0] + Math.cos(r) * h + 2, c[1] + Math.sin(r) * h]} w={3.5} c={PROP} />;
    }
    case "pad": {
      const c = at(j, p.at);
      const o = p.offset ?? [0, 0];
      return <circle cx={c[0] + o[0]} cy={c[1] + o[1]} r={3.6} fill={PROP} />;
    }
    case "wheel":
      return <circle cx={p.c[0]} cy={p.c[1]} r={p.r} fill="none" stroke={PROP} strokeWidth={2} />;
  }
}

/** Draws one frame. t: 0 = start position, 1 = finish position. */
export function FigureFrame({ template, weight, t }: { template: Template; weight: Weight | null; t: number }) {
  const pose = mix(template.start, template.end, t);
  const front = !!template.spread;
  const j = rig(pose, { spread: template.spread ?? 0 });
  const hi = new Set<Seg>(template.accent);
  const col = (s: Seg) => (hi.has(s) ? ACCENT : BODY);
  const far = front ? 1 : 0.42;
  const LIMB = 6.5;
  const toe = (f: P, dir: number): P => [f[0] + 5 * dir, f[1] + 0.5];
  const grounded = (f: P) => Math.abs(f[1] - FLOOR) < 3 || template.props?.some((p) => p.k === "step");
  const wAt = template.weight?.at ?? "hand";

  return (
    <g>
      {template.floor !== false && <Line a={[-4, FLOOR + 1.5]} b={[104, FLOOR + 1.5]} w={1.2} c={PROP} />}
      {template.props?.map((p, i) => <PropShape key={i} p={p} j={j} />)}

      {/* far limbs */}
      <g opacity={far}>
        <Line a={j.hip2} b={j.knee2} w={LIMB} c={col("thigh")} />
        <Line a={j.knee2} b={j.foot2} w={LIMB - 0.8} c={col("shin")} />
        {grounded(j.foot2) && <Line a={j.foot2} b={toe(j.foot2, front ? -1 : 1)} w={3.5} c={BODY} />}
        <Line a={j.shoulder2} b={j.elbow2} w={LIMB - 0.5} c={col("upper")} />
        <Line a={j.elbow2} b={j.hand2} w={LIMB - 1.5} c={col("fore")} />
      </g>
      {weight && template.weight?.both && <WeightShape kind={weight} p={j.hand2} />}

      {/* torso + head */}
      <Line a={j.hip} b={j.shoulder} w={front ? 12 : 10} c={col("torso")} />
      {front && <Line a={j.hip2} b={j.shoulder2} w={12} c={col("torso")} />}
      <circle cx={j.head[0]} cy={j.head[1]} r={6} fill={BODY} />

      {/* near limbs */}
      <Line a={j.hip} b={j.knee} w={LIMB + 0.5} c={col("thigh")} />
      <Line a={j.knee} b={j.foot} w={LIMB - 0.5} c={col("shin")} />
      {grounded(j.foot) && <Line a={j.foot} b={toe(j.foot, 1)} w={3.5} c={BODY} />}
      {weight && wAt !== "hand" && <WeightShape kind={weight} p={add(at(j, wAt), template.weight?.offset)} />}
      <Line a={j.shoulder} b={j.elbow} w={LIMB} c={col("upper")} />
      <Line a={j.elbow} b={j.hand} w={LIMB - 1} c={col("fore")} />
      {weight && wAt === "hand" && <WeightShape kind={weight} p={add(j.hand, template.weight?.offset)} />}
    </g>
  );
}

const add = (p: P, o?: P): P => (o ? [p[0] + o[0], p[1] + o[1]] : p);

export const FIGURE_VIEWBOX = "-6 -14 112 112";

/** Square viewBox fitted to the figure (+ equipment) across the given frames, so thumbnails fill their box. */
export function fittedViewBox(template: Template, frames: number[], pad = 7, min = 56): string {
  const pts: P[] = [];
  for (const t of frames) {
    const j = rig(mix(template.start, template.end, t), { spread: template.spread ?? 0 });
    pts.push(...Object.values(j));
    pts.push([j.head[0], j.head[1] - 6]);
  }
  for (const p of template.props ?? []) {
    if ("from" in p) pts.push(p.from, p.to);
    if (p.k === "step") pts.push([p.x, FLOOR - p.h], [p.x + p.w, FLOOR]);
    if (p.k === "wheel") pts.push([p.c[0] - p.r, p.c[1] - p.r], [p.c[0] + p.r, p.c[1] + p.r]);
  }
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
  let x0 = Math.min(...xs) - pad, x1 = Math.max(...xs) + pad, y0 = Math.min(...ys) - pad, y1 = Math.max(...ys) + pad;
  const size = Math.max(min, x1 - x0, y1 - y0);
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  x0 = cx - size / 2; y0 = cy - size / 2;
  return `${x0.toFixed(1)} ${y0.toFixed(1)} ${size.toFixed(1)} ${size.toFixed(1)}`;
}

/** Static thumbnail shown beside an exercise (plan, day, logger, editor, summary). */
export function ExerciseThumb({ slug, size = 48, className, t }: { slug: string; size?: number; className?: string; t?: number }) {
  const f = figureFor(slug);
  return (
    <span className={clsx("inline-grid shrink-0 place-items-center overflow-hidden rounded-xl bg-surface-2", className)} style={{ width: size, height: size }} aria-hidden>
      {f && (
        <svg viewBox={fittedViewBox(f.template, [t ?? f.template.thumb ?? 1])} width={size} height={size}>
          <FigureFrame template={f.template} weight={f.weight} t={t ?? f.template.thumb ?? 1} />
        </svg>
      )}
    </span>
  );
}
