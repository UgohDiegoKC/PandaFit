"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { ArrowDown, ArrowUp, Plus, Repeat, Trash2 } from "lucide-react";
import { FieldError } from "@/components/ui";
import { ExerciseThumb } from "@/components/exercise-figure";
import type { PlanExerciseDraft } from "@/lib/plan/types";
import { saveDayEdits } from "../../actions";

type CatalogItem = { slug: string; name: string; primary: string; substitutions: string[] };

function NumberField({ label, value, onChange, min, max, step = 1 }: { label: string; value: number; onChange: (n: number) => void; min: number; max: number; step?: number }) {
  return (
    <label className="block">
      <span className="eyebrow">{label}</span>
      <input type="number" className="input mt-1 px-3 py-2" value={value} min={min} max={max} step={step} onChange={(e) => onChange(Number(e.target.value))} />
    </label>
  );
}

export function DayEditor({ dayId, title: initialTitle, initial, catalog }: { dayId: string; title: string; initial: PlanExerciseDraft[]; catalog: CatalogItem[] }) {
  const [title, setTitle] = useState(initialTitle);
  const [items, setItems] = useState(initial);
  const [adding, setAdding] = useState(false);
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();
  const bySlug = useMemo(() => new Map(catalog.map((c) => [c.slug, c])), [catalog]);

  const update = (i: number, patch: Partial<PlanExerciseDraft>) => setItems((cur) => cur.map((e, j) => (j === i ? { ...e, ...patch } : e)));
  const move = (i: number, d: -1 | 1) => setItems((cur) => {
    const next = [...cur];
    const [x] = next.splice(i, 1);
    next.splice(Math.max(0, Math.min(next.length, i + d)), 0, x);
    return next;
  });
  const results = catalog.filter((c) => !items.some((e) => e.slug === c.slug) && (c.name + c.primary).toLowerCase().includes(query.toLowerCase())).slice(0, 8);

  const save = () => start(async () => {
    setError(undefined);
    const res = await saveDayEdits(dayId, { title, exercises: items });
    if (res?.error) setError(res.error);
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <Link href={`/app/plan/day/${dayId}`} className="text-sm text-muted hover:text-fg">Cancel</Link>
        <h1 className="text-lg font-semibold">Customize workout</h1>
        <span className="w-12" />
      </div>

      <label className="block">
        <span className="label">Workout name</span>
        <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={60} />
      </label>

      <ul className="space-y-3">
        {items.map((e, i) => {
          const c = bySlug.get(e.slug);
          return (
            <li key={e.slug} className="card p-4">
              <div className="flex items-center gap-3">
                <ExerciseThumb slug={e.slug} size={48} />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold">{c?.name ?? e.slug}</div>
                  <div className="text-xs text-muted">{c?.primary}</div>
                </div>
                <button type="button" onClick={() => move(i, -1)} className="btn-ghost p-2" aria-label="Move up" disabled={i === 0}><ArrowUp size={16} /></button>
                <button type="button" onClick={() => move(i, 1)} className="btn-ghost p-2" aria-label="Move down" disabled={i === items.length - 1}><ArrowDown size={16} /></button>
                <button type="button" onClick={() => setItems((cur) => cur.filter((_, j) => j !== i))} className="btn-ghost p-2 hover:text-danger" aria-label={`Remove ${c?.name}`}><Trash2 size={16} /></button>
              </div>
              <div className="mt-3 grid grid-cols-4 gap-2">
                <NumberField label="Sets" value={e.sets} min={1} max={5} onChange={(n) => update(i, { sets: n })} />
                <NumberField label="Reps min" value={e.repsMin} min={1} max={90} onChange={(n) => update(i, { repsMin: n })} />
                <NumberField label="Reps max" value={e.repsMax} min={1} max={90} onChange={(n) => update(i, { repsMax: n })} />
                <NumberField label="Rest (s)" value={e.restSec} min={30} max={240} step={15} onChange={(n) => update(i, { restSec: n })} />
              </div>
              {c && c.substitutions.length > 0 && (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Repeat size={14} className="text-muted" aria-hidden />
                  {c.substitutions.filter((s) => bySlug.has(s) && !items.some((x) => x.slug === s)).map((s) => (
                    <button key={s} type="button" onClick={() => update(i, { slug: s })} className="rounded-full bg-surface-2 px-3 py-1 text-xs text-muted hover:text-fg">
                      Swap for {bySlug.get(s)!.name}
                    </button>
                  ))}
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {adding ? (
        <div className="card p-4">
          <input autoFocus className="input" placeholder="Search exercises or muscles…" value={query} onChange={(e) => setQuery(e.target.value)} />
          <ul className="mt-2 divide-y divide-line">
            {results.map((r) => (
              <li key={r.slug}>
                <button type="button" className="flex w-full items-center justify-between py-2 text-left text-sm hover:text-accent-ink" onClick={() => {
                  setItems((cur) => [...cur, { slug: r.slug, sets: 3, repsMin: 8, repsMax: 12, restSec: 90, weightGuidance: "Choose a weight you can lift with good form, stopping 2 reps short of failure.", notes: null }]);
                  setAdding(false); setQuery("");
                }}>
                  <span className="flex items-center gap-3"><ExerciseThumb slug={r.slug} size={32} className="rounded-lg" />{r.name}</span><span className="text-muted">{r.primary}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <button type="button" onClick={() => setAdding(true)} className="btn-secondary w-full" disabled={items.length >= 8}><Plus size={16} /> Add exercise</button>
      )}

      <p className="text-xs text-muted">Changes are re-checked against PandaFit&apos;s safety rules — values may be adjusted to safe ranges and to fit your session time.</p>
      <FieldError>{error}</FieldError>
      <button onClick={save} disabled={pending} className="btn w-full bg-fg py-4 text-base text-bg">{pending ? "Saving…" : "Save"}</button>
    </div>
  );
}
