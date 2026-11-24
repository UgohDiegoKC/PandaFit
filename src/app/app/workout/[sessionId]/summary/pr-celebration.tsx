"use client";

import { useEffect, useState } from "react";
import { Trophy } from "lucide-react";
import { getExercise } from "@/lib/catalog";
import { fromKg, weightUnit, type UnitSystem } from "@/lib/units";

type Pr = { exerciseSlug: string; kind: "max_weight" | "est_1rm" | "max_reps"; value: number; previous: number | null; weightKg: number; reps: number };
const KIND = { max_weight: "Heaviest weight", est_1rm: "Est. one-rep max", max_reps: "Most reps" };

/** Shows the records returned when the session was finished (once — they aren't re-celebrated on revisit). */
export function PrCelebration({ sessionId, unit }: { sessionId: string; unit: UnitSystem }) {
  const [prs, setPrs] = useState<Pr[]>([]);
  useEffect(() => {
    const key = `pf-prs-${sessionId}`;
    const raw = sessionStorage.getItem(key);
    if (raw) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrating from browser storage after SSR is intentional
      setPrs(JSON.parse(raw));
      sessionStorage.removeItem(key);
    }
  }, [sessionId]);
  if (!prs.length) return null;

  // One line per exercise: prefer the heaviest-weight record.
  const byEx = new Map<string, Pr>();
  for (const p of prs) if (!byEx.has(p.exerciseSlug) || p.kind === "max_weight") byEx.set(p.exerciseSlug, p);
  const u = weightUnit(unit);
  const fmt = (p: Pr) => (p.kind === "max_reps" ? `${p.value} reps` : `${Math.round(fromKg(p.value, unit) * 10) / 10} ${u}`);

  return (
    <div className="rounded-[var(--radius-card)] bg-accent p-5 text-on-accent" role="status">
      <div className="flex items-center gap-2 font-bold"><Trophy size={20} aria-hidden /> {byEx.size === 1 ? "New personal record!" : `${byEx.size} new personal records!`}</div>
      <ul className="mt-3 space-y-1.5 text-sm">
        {[...byEx.values()].map((p) => (
          <li key={p.exerciseSlug} className="flex justify-between gap-3">
            <span>{getExercise(p.exerciseSlug)?.name} · {KIND[p.kind]}</span>
            <span className="font-semibold">{fmt(p)}{p.previous !== null && <span className="font-normal opacity-70"> (was {p.kind === "max_reps" ? p.previous : Math.round(fromKg(p.previous, unit) * 10) / 10})</span>}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
