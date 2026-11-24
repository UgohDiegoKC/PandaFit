"use client";

import { useMemo, useState, useTransition } from "react";
import clsx from "clsx";
import { CalendarClock } from "lucide-react";
import { FieldError } from "@/components/ui";
import { book, cancel, reschedule, type BookingResult } from "./actions";

interface Slot { id: string; date: string; time: string; durationMin: number; coachName: string; dayLabel: string; dayNum: number }
interface Upcoming { id: string; seriesId: string; cadence: "weekly" | "biweekly"; coachName: string; label: string; durationMin: number }

export function BookingPanel({ upcoming, slots }: { upcoming: Upcoming[]; slots: Slot[] }) {
  const days = useMemo(() => {
    const m = new Map<string, Slot[]>();
    for (const s of slots) m.set(s.date, [...(m.get(s.date) ?? []), s]);
    return [...m.entries()];
  }, [slots]);
  const [day, setDay] = useState(days[0]?.[0]);
  const [slotId, setSlotId] = useState<string>();
  const [cadence, setCadence] = useState<"weekly" | "biweekly">("weekly");
  const [moving, setMoving] = useState<Upcoming | null>(null);
  const [result, setResult] = useState<BookingResult>();
  const [pending, start] = useTransition();

  const act = (fn: () => Promise<BookingResult>) => start(async () => { setResult(await fn()); setSlotId(undefined); setMoving(null); });
  const daySlots = days.find(([d]) => d === day)?.[1] ?? [];
  const showPicker = upcoming.length === 0 || moving;

  return (
    <div className="space-y-6">
      {result?.message && <p role="status" className="card border-accent/40 bg-accent-faint p-3 text-sm">{result.message}</p>}
      <FieldError>{result?.error}</FieldError>

      {upcoming.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-semibold">Upcoming</h2>
          {upcoming.map((u) => (
            <div key={u.id} className={clsx("card flex flex-wrap items-center gap-3 p-4", moving?.id === u.id && "border-accent")}>
              <CalendarClock className="text-accent-ink" aria-hidden />
              <div className="flex-1">
                <div className="font-semibold">{u.label}</div>
                <div className="text-xs text-muted">{u.durationMin} min with {u.coachName} · {u.cadence === "weekly" ? "weekly" : "every 2 weeks"}</div>
              </div>
              <div className="flex gap-1">
                <button className="btn-secondary px-4 py-2" disabled={pending} onClick={() => setMoving(moving?.id === u.id ? null : u)}>{moving?.id === u.id ? "Keep" : "Reschedule"}</button>
                <button className="btn-ghost px-3 py-2 hover:text-danger" disabled={pending} onClick={() => confirm("Cancel this check-in?") && act(() => cancel(u.id, "one"))}>Cancel</button>
              </div>
            </div>
          ))}
          <button className="text-sm text-muted underline hover:text-danger" disabled={pending} onClick={() => confirm("Cancel all upcoming check-ins?") && act(() => cancel(upcoming[0].id, "series"))}>Cancel all upcoming</button>
        </section>
      )}

      {showPicker && (
        <section className="space-y-4">
          <h2 className="font-semibold">{moving ? `Pick a new time for ${moving.label}` : "Book a check-in"}</h2>
          {days.length === 0 ? (
            <p className="card p-5 text-sm text-muted">No open times in the next three weeks. Check back soon — coaches add availability regularly.</p>
          ) : (
            <>
              <div className="flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Day">
                {days.map(([d, s]) => (
                  <button key={d} role="tab" aria-selected={d === day} onClick={() => { setDay(d); setSlotId(undefined); }}
                    className={clsx("flex min-w-14 flex-col items-center rounded-2xl px-3 py-2 text-sm", d === day ? "bg-accent text-on-accent" : "bg-surface-2 text-muted")}>
                    <span className="text-[11px] uppercase">{s[0].dayLabel}</span><span className="text-lg font-bold">{s[0].dayNum}</span>
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4" role="radiogroup" aria-label="Time">
                {daySlots.map((s) => (
                  <button key={s.id} role="radio" aria-checked={slotId === s.id} data-active={slotId === s.id} onClick={() => setSlotId(s.id)} className="chip">
                    {s.time}<span className="block text-[11px] opacity-70">{s.coachName} · {s.durationMin}m</span>
                  </button>
                ))}
              </div>
              {!moving && (
                <div>
                  <span className="label">How often</span>
                  <div className="grid grid-cols-2 gap-2" role="radiogroup">
                    {(["weekly", "biweekly"] as const).map((c) => (
                      <button key={c} role="radio" aria-checked={cadence === c} data-active={cadence === c} onClick={() => setCadence(c)} className="chip">{c === "weekly" ? "Weekly" : "Every 2 weeks"}</button>
                    ))}
                  </div>
                  <p className="mt-2 text-xs text-muted">We&apos;ll book the next 4 check-ins at this time where the coach is free, and tell you about any we couldn&apos;t.</p>
                </div>
              )}
              <button className="btn-primary w-full" disabled={!slotId || pending}
                onClick={() => act(() => (moving ? reschedule(moving.id, slotId!) : book(slotId!, cadence)))}>
                {pending ? "Saving…" : moving ? "Move check-in" : "Book check-ins"}
              </button>
            </>
          )}
        </section>
      )}
    </div>
  );
}
