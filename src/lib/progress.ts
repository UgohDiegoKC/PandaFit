/**
 * Pure progress logic: weekly streaks, personal-record detection, volume summaries.
 * No DB access here so it can be unit-tested and reused by the mobile apps' backend calls.
 */

export const DAY_MS = 86_400_000;

/** ISO date (YYYY-MM-DD) in UTC. */
export const isoDate = (d: Date) => d.toISOString().slice(0, 10);

/** Monday-start week key for a date (YYYY-MM-DD of that Monday, UTC). */
export function weekStart(d: Date): string {
  const day = d.getUTCDay(); // 0=Sun
  const diff = (day + 6) % 7;
  return isoDate(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - diff)));
}

export interface BreakRange {
  startsOn: string;
  endsOn: string;
  endedEarlyOn?: string | null;
}

function effectiveEnd(b: BreakRange) {
  return b.endedEarlyOn && b.endedEarlyOn < b.endsOn ? b.endedEarlyOn : b.endsOn;
}

/** A week is "frozen" if a break covers at least 4 of its 7 days — it neither extends nor breaks a streak. */
function weekFrozen(weekKey: string, breaks: BreakRange[]) {
  const start = new Date(weekKey + "T00:00:00Z").getTime();
  let covered = 0;
  for (let i = 0; i < 7; i++) {
    const day = isoDate(new Date(start + i * DAY_MS));
    if (breaks.some((b) => day >= b.startsOn && day <= effectiveEnd(b))) covered++;
  }
  return covered >= 4;
}

/**
 * Weekly streak = consecutive weeks (ending this week) with at least `perWeek` completed workouts.
 * The current week only counts once it qualifies; until then it doesn't break the streak.
 */
export function weeklyStreak(completedDates: Date[], breaks: BreakRange[], now = new Date(), perWeek = 1) {
  const counts = new Map<string, number>();
  for (const d of completedDates) counts.set(weekStart(d), (counts.get(weekStart(d)) ?? 0) + 1);

  let streak = 0;
  let cursor = new Date(weekStart(now) + "T00:00:00Z");
  const thisWeek = isoDate(cursor);
  for (let i = 0; i < 520; i++) {
    const key = isoDate(cursor);
    const hit = (counts.get(key) ?? 0) >= perWeek;
    if (hit) streak++;
    else if (key === thisWeek || weekFrozen(key, breaks)) {
      /* in-progress week or break week: skip without breaking */
    } else break;
    cursor = new Date(cursor.getTime() - 7 * DAY_MS);
  }
  return streak;
}

/** Monday keys for the last `n` weeks, oldest first. */
export function lastWeekStarts(n: number, now = new Date()) {
  return Array.from({ length: n }, (_, i) => weekStart(new Date(now.getTime() - (n - 1 - i) * 7 * DAY_MS)));
}

export function activeBreak<T extends BreakRange>(breaks: T[], today = isoDate(new Date())): T | null {
  return breaks.find((b) => today >= b.startsOn && today <= effectiveEnd(b)) ?? null;
}

// ── Personal records ───────────────────────────────────────────

export type PrKind = "max_weight" | "est_1rm" | "max_reps";

export interface LoggedSet {
  exerciseSlug: string;
  weightKg: number;
  reps: number;
  completed: boolean;
}

export interface ExistingPr {
  exerciseSlug: string;
  kind: PrKind;
  value: number;
}

export interface NewPr {
  exerciseSlug: string;
  kind: PrKind;
  value: number;
  previous: number | null;
  weightKg: number;
  reps: number;
}

/** Epley estimate; only trusted for 1–12 reps. */
export const estimate1RM = (w: number, r: number) => (r === 1 ? w : w * (1 + r / 30));

const MIN_IMPROVEMENT = 0.01;

/**
 * Detect new bests from one session's sets.
 * - Ignores incomplete, zero-rep and implausible sets (avoids misleading celebrations).
 * - At most one record per exercise per kind per session.
 * - First-ever log of an exercise establishes a baseline silently (no celebration), per `celebrateFirst`.
 */
export function detectPRs(sets: LoggedSet[], existing: ExistingPr[], celebrateFirst = false): { records: NewPr[]; baselines: NewPr[] } {
  const best = new Map<string, NewPr>();
  for (const s of sets) {
    if (!s.completed || s.reps <= 0 || s.reps > 100 || s.weightKg < 0 || s.weightKg > 600) continue;
    const candidates: [PrKind, number][] =
      s.weightKg > 0
        ? [["max_weight", s.weightKg], ...(s.reps <= 12 ? ([["est_1rm", round1(estimate1RM(s.weightKg, s.reps))]] as [PrKind, number][]) : [])]
        : [["max_reps", s.reps]];
    for (const [kind, value] of candidates) {
      const key = `${s.exerciseSlug}:${kind}`;
      const cur = best.get(key);
      if (!cur || value > cur.value) best.set(key, { exerciseSlug: s.exerciseSlug, kind, value, previous: null, weightKg: s.weightKg, reps: s.reps });
    }
  }

  const records: NewPr[] = [];
  const baselines: NewPr[] = [];
  for (const pr of best.values()) {
    const prev = existing.find((e) => e.exerciseSlug === pr.exerciseSlug && e.kind === pr.kind);
    if (!prev) (celebrateFirst ? records : baselines).push(pr);
    else if (pr.value > prev.value + MIN_IMPROVEMENT) records.push({ ...pr, previous: prev.value });
  }
  return { records, baselines };
}

const round1 = (n: number) => Math.round(n * 10) / 10;

export function sessionVolume(sets: LoggedSet[]) {
  return sets.filter((s) => s.completed).reduce((v, s) => v + s.weightKg * s.reps, 0);
}

/** Last `weeks` weeks of daily activity for the heatmap: array of weeks, each 7 days Mon..Sun. */
export function activityGrid(completedDates: Date[], weeks = 18, now = new Date()) {
  const done = new Set(completedDates.map(isoDate));
  const start = new Date(weekStart(now) + "T00:00:00Z").getTime() - (weeks - 1) * 7 * DAY_MS;
  const today = isoDate(now);
  return Array.from({ length: weeks }, (_, w) =>
    Array.from({ length: 7 }, (_, d) => {
      const date = isoDate(new Date(start + (w * 7 + d) * DAY_MS));
      return { date, active: done.has(date), future: date > today };
    }),
  );
}
