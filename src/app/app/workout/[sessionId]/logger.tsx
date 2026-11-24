"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { Check, ChevronLeft, Info, Pause, Play, Plus, SkipBack, SkipForward, Timer, Trophy, X } from "lucide-react";
import { fromKg, toKg, weightUnit, type UnitSystem } from "@/lib/units";
import { ExerciseThumb } from "@/components/exercise-figure";

export interface LoggerSet { weightKg: number; reps: number; completed: boolean }
export interface LoggerExercise {
  slug: string; name: string; timed: boolean; targetSets: number; repsMin: number; repsMax: number; restSec: number; guidance: string;
  last: { weightKg: number; reps: number; sets: number } | null;
  monthBest: { weightKg: number; reps: number } | null;
  prWeightKg: number | null;
  sets: LoggerSet[];
}

const pad = (n: number) => String(n).padStart(2, "0");
const clock = (s: number) => `${pad(Math.floor(s / 60))}:${pad(Math.floor(s % 60))}`;
const round = (n: number) => Math.round(n * 10) / 10;

export function Logger({ sessionId, title, startedAt, unit, exercises: initial }: { sessionId: string; title: string; startedAt: number; unit: UnitSystem; exercises: LoggerExercise[] }) {
  const router = useRouter();
  const storageKey = `pf-session-${sessionId}`;
  const [exercises, setExercises] = useState(initial);
  const [idx, setIdx] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [rest, setRest] = useState<{ total: number; left: number; paused: boolean } | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();
  const hydrated = useRef(false);

  // Restore an unsaved local draft (e.g. after a refresh or dropped connection).
  useEffect(() => {
    try {
      const draft = localStorage.getItem(storageKey);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrating from browser storage after SSR is intentional
      if (draft) setExercises(JSON.parse(draft));
    } catch { /* ignore corrupt drafts */ }
    hydrated.current = true;
  }, [storageKey]);

  useEffect(() => {
    if (hydrated.current) localStorage.setItem(storageKey, JSON.stringify(exercises));
  }, [exercises, storageKey]);

  useEffect(() => {
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - startedAt) / 1000)), 1000);
    return () => clearInterval(t);
  }, [startedAt]);

  useEffect(() => {
    if (!rest || rest.paused || rest.left <= 0) return;
    const t = setTimeout(() => setRest((r) => (r ? { ...r, left: r.left - 1 } : r)), 1000);
    if (rest.left === 1 && "vibrate" in navigator) navigator.vibrate?.(200);
    return () => clearTimeout(t);
  }, [rest]);

  const ex = exercises[idx];
  const doneSets = ex.sets.filter((s) => s.completed).length;
  const bestThisSession = Math.max(0, ...ex.sets.filter((s) => s.completed).map((s) => s.weightKg));
  const isPr = ex.prWeightKg !== null && bestThisSession > ex.prWeightKg;
  const totalDone = exercises.reduce((n, e) => n + e.sets.filter((s) => s.completed).length, 0);

  const updateSet = (si: number, patch: Partial<LoggerSet>) =>
    setExercises((cur) => cur.map((e, i) => (i !== idx ? e : { ...e, sets: e.sets.map((s, j) => (j === si ? { ...s, ...patch } : s)) })));

  const toggle = (si: number) => {
    const s = ex.sets[si];
    updateSet(si, { completed: !s.completed });
    if (!s.completed && si < ex.sets.length - 1) setRest({ total: ex.restSec, left: ex.restSec, paused: false });
    if (!s.completed && si === ex.sets.length - 1 && idx < exercises.length - 1) setRest({ total: ex.restSec, left: ex.restSec, paused: false });
  };

  const addSet = () =>
    setExercises((cur) => cur.map((e, i) => (i !== idx ? e : { ...e, sets: [...e.sets, { ...(e.sets.at(-1) ?? { weightKg: 0, reps: e.repsMax }), completed: false }] })));

  const payload = useCallback((complete: boolean) => ({
    complete,
    durationSec: Math.min(elapsed, 6 * 3600),
    sets: exercises.flatMap((e) => e.sets.map((s, i) => ({ exerciseSlug: e.slug, setNumber: i + 1, weightKg: round(s.weightKg), reps: s.reps, completed: s.completed }))),
  }), [elapsed, exercises]);

  const save = async (complete: boolean) => {
    setSaving(true);
    setError(undefined);
    try {
      const res = await fetch(`/api/sessions/${sessionId}`, { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(payload(complete)) });
      if (!res.ok) throw new Error();
      localStorage.removeItem(storageKey);
      if (complete) {
        const { records } = await res.json();
        sessionStorage.setItem(`pf-prs-${sessionId}`, JSON.stringify(records));
        router.replace(`/app/workout/${sessionId}/summary`);
      } else router.push("/app");
    } catch {
      setError("Couldn't save — your sets are kept on this device. Check your connection and try again.");
      setSaving(false);
    }
  };

  const u = weightUnit(unit);
  const display = (kg: number) => round(fromKg(kg, unit));
  const reps = ex.repsMin === ex.repsMax ? `${ex.repsMin}` : `${ex.repsMin}–${ex.repsMax}`;
  const restPct = useMemo(() => (rest ? (rest.left / rest.total) * 100 : 0), [rest]);

  return (
    <div className="mx-auto max-w-lg pb-40">
      <div className="flex items-center justify-between">
        <Link href="/app" className="grid size-10 place-items-center rounded-full bg-surface-2" aria-label="Leave workout (progress is kept)"><ChevronLeft size={18} /></Link>
        <span className="text-sm text-muted">{title}</span>
        <button onClick={() => save(false)} disabled={saving} className="text-sm text-muted hover:text-fg">Save & exit</button>
      </div>

      <div className="mt-6">
        <div className="text-4xl font-bold tabular-nums" aria-label={`Elapsed ${clock(elapsed)}`}>{clock(elapsed)}</div>
        <Link href={`/app/exercises/${ex.slug}`} className="mt-3 flex items-center gap-3" aria-label={`${ex.name} — how to do it`}>
          <ExerciseThumb slug={ex.slug} size={64} />
          <span className="min-w-0">
            <span className="block text-2xl font-bold leading-tight">{ex.name}</span>
            <span className="eyebrow mt-1 block">Exercise {idx + 1}/{exercises.length} · target {ex.targetSets} × {reps} {ex.timed ? "sec" : "reps"}</span>
          </span>
        </Link>
      </div>

      <div className="-mx-1 mt-4 flex gap-2 overflow-x-auto p-1" role="tablist" aria-label="Exercises in this workout">
        {exercises.map((e, i) => {
          const done = e.sets.length > 0 && e.sets.every((s) => s.completed);
          return (
            <button key={e.slug} role="tab" aria-selected={i === idx} aria-label={`${e.name}${done ? " (done)" : ""}`} onClick={() => setIdx(i)}
              className={clsx("relative shrink-0 rounded-xl ring-2 transition", i === idx ? "ring-accent" : "ring-transparent", done && i !== idx && "opacity-50")}>
              <ExerciseThumb slug={e.slug} size={44} />
              {done && <span className="absolute -right-1 -top-1 grid size-4 place-items-center rounded-full bg-accent text-on-accent"><Check size={10} strokeWidth={4} /></span>}
            </button>
          );
        })}
      </div>

      {isPr && (
        <div className="mt-4 flex items-center gap-3 rounded-2xl bg-accent px-4 py-3 text-on-accent" role="status">
          <Trophy size={20} aria-hidden />
          <span className="flex-1 text-sm font-semibold">New personal record</span>
          <span className="text-sm font-bold">{display(bestThisSession)} {u}</span>
        </div>
      )}

      <div className="card mt-4 grid grid-cols-3 divide-x divide-line">
        <div className="px-4 py-3">
          <div className="eyebrow">Sets</div>
          <div className="mt-1 text-xl font-semibold">{doneSets}<span className="text-sm text-muted"> / {ex.sets.length}</span></div>
          <div className="mt-2 flex gap-1">{ex.sets.map((s, i) => <span key={i} className={clsx("h-1 flex-1 rounded-full", s.completed ? "bg-accent" : "bg-surface-3")} />)}</div>
        </div>
        <div className="px-4 py-3">
          <div className="eyebrow">Last time</div>
          <div className="mt-1 text-xl font-semibold">{ex.last ? `${display(ex.last.weightKg)} ${u}` : "—"}</div>
          <div className="text-xs text-muted">{ex.last ? `${ex.last.sets} × ${ex.last.reps}` : "First time"}</div>
        </div>
        <div className="px-4 py-3">
          <div className="eyebrow">Best · month</div>
          <div className="mt-1 text-xl font-semibold">{ex.monthBest ? `${display(ex.monthBest.weightKg)} ${u}` : "—"}</div>
          <div className="text-xs text-muted">{ex.monthBest ? `× ${ex.monthBest.reps}` : " "}</div>
        </div>
      </div>

      {!ex.last && <p className="mt-3 flex gap-2 text-xs text-muted"><Info size={14} className="mt-0.5 shrink-0" aria-hidden />{ex.guidance}</p>}

      <ol className="mt-4 space-y-2.5">
        {ex.sets.map((s, si) => (
          <li key={si} className={clsx("relative flex items-center gap-3 overflow-hidden rounded-2xl border px-4 py-3 transition", s.completed ? "border-line bg-surface" : "border-line-strong bg-surface-2")}>
            <button onClick={() => toggle(si)} aria-pressed={s.completed} aria-label={`Mark set ${si + 1} ${s.completed ? "not done" : "done"}`}
              className={clsx("z-10 grid size-8 shrink-0 place-items-center rounded-full border-2 transition", s.completed ? "border-accent bg-accent text-on-accent" : "border-muted")}>
              {s.completed && <Check size={16} strokeWidth={3} />}
            </button>
            <label className={clsx("z-10 flex items-baseline gap-1 rounded-lg px-2 py-1", !s.completed && "bg-bg")}>
              <input type="number" inputMode="decimal" min={0} step={unit === "imperial" ? 2.5 : 1.25} aria-label={`Set ${si + 1} weight in ${u}`}
                value={display(s.weightKg)} onChange={(e) => updateSet(si, { weightKg: toKg(Number(e.target.value) || 0, unit) })}
                className={clsx("w-16 bg-transparent text-lg font-semibold tabular-nums outline-none", s.completed && "text-muted")} />
              <span className="text-xs text-muted">{u}</span>
            </label>
            <span className="z-10 text-muted">×</span>
            <label className={clsx("z-10 flex items-baseline gap-1 rounded-lg px-2 py-1", !s.completed && "bg-bg")}>
              <input type="number" inputMode="numeric" min={0} aria-label={`Set ${si + 1} ${ex.timed ? "seconds" : "reps"}`}
                value={s.reps} onChange={(e) => updateSet(si, { reps: Math.max(0, Math.round(Number(e.target.value) || 0)) })}
                className={clsx("w-12 bg-transparent text-lg font-semibold tabular-nums outline-none", s.completed && "text-muted")} />
              <span className="text-xs text-muted">{ex.timed ? "sec" : "reps"}</span>
            </label>
            <span className="pointer-events-none absolute -right-1 text-6xl font-black tabular-nums text-ghost" aria-hidden>{pad(si + 1)}</span>
          </li>
        ))}
      </ol>
      <button onClick={addSet} className="btn-secondary mt-3 w-full"><Plus size={16} /> Add set</button>

      <div className="mt-6 grid grid-cols-3 overflow-hidden rounded-2xl bg-surface-2">
        <button onClick={() => setIdx((i) => Math.max(0, i - 1))} disabled={idx === 0} className="grid place-items-center py-5 disabled:opacity-30" aria-label="Previous exercise"><SkipBack size={22} fill="currentColor" /></button>
        <Link href={`/app/exercises/${ex.slug}`} className="grid place-items-center border-x border-line py-5 text-xs font-semibold text-muted hover:text-fg">How to</Link>
        <button onClick={() => setIdx((i) => Math.min(exercises.length - 1, i + 1))} disabled={idx === exercises.length - 1} className="grid place-items-center py-5 disabled:opacity-30" aria-label="Next exercise"><SkipForward size={22} fill="currentColor" /></button>
      </div>

      {error && <p role="alert" className="mt-4 text-sm text-danger">{error}</p>}
      <button onClick={() => save(true)} disabled={saving || totalDone === 0} className="btn-primary mt-4 w-full py-4 text-base">
        {saving ? "Saving…" : "Finish workout"}
      </button>

      {rest && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 backdrop-blur" role="timer" aria-live="off">
          <div className="mx-auto flex max-w-lg items-center gap-4 px-5 py-4">
            <Timer size={18} className="text-muted" aria-hidden />
            <span className={clsx("w-14 text-lg font-semibold tabular-nums", rest.left === 0 && "text-accent-ink")}>{rest.left === 0 ? "Go!" : clock(rest.left)}</span>
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-3"><div className="h-full rounded-full bg-accent transition-[width] duration-1000 ease-linear" style={{ width: `${restPct}%` }} /></div>
            <button onClick={() => setRest((r) => (r ? { ...r, paused: !r.paused } : r))} aria-label={rest.paused ? "Resume rest timer" : "Pause rest timer"} className="text-muted hover:text-fg">{rest.paused ? <Play size={18} /> : <Pause size={18} />}</button>
            <button onClick={() => setRest(null)} aria-label="Dismiss rest timer" className="text-muted hover:text-fg"><X size={18} /></button>
          </div>
        </div>
      )}
    </div>
  );
}
