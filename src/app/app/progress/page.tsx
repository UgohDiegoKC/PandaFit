import Link from "next/link";
import { Coffee, Flame, Trophy } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getPRs, getProgressSummary, getSetsForSessions } from "@/lib/queries";
import { getExercise } from "@/lib/catalog";
import { isoDate, lastWeekStarts, sessionVolume, weekStart } from "@/lib/progress";
import { formatDuration, formatNumber, formatWeight, fromKg, weightUnit } from "@/lib/units";
import { ActivityHeatmap } from "@/components/heatmap";
import { EmptyState, PageHeader } from "@/components/ui";
import { ExerciseThumb } from "@/components/exercise-figure";
import { adjustBreak, endBreak } from "./actions";
import { BreakForm } from "./break-form";

export const metadata = { title: "Progress" };

export default async function ProgressPage() {
  const user = await requireUser();
  const p = await getProgressSummary(user.id);
  const [prs, sets] = await Promise.all([getPRs(user.id), getSetsForSessions(p.sessions.map((s) => s.id))]);
  const u = user.unitSystem;

  // Weekly volume for the last 8 weeks.
  const weeks = lastWeekStarts(8);
  const volByWeek = new Map(weeks.map((w) => [w, 0]));
  for (const s of p.sessions) {
    const w = weekStart(s.completedAt!);
    if (volByWeek.has(w)) volByWeek.set(w, volByWeek.get(w)! + sessionVolume(sets.filter((x) => x.sessionId === s.id)));
  }
  const maxVol = Math.max(1, ...volByWeek.values());
  const topPrs = prs.filter((r) => r.kind === "max_weight" || r.kind === "max_reps").slice(0, 8);
  const today = isoDate(new Date());

  return (
    <div className="space-y-6">
      <PageHeader title="Progress" subtitle={`${p.sessions.length} workouts logged`} />

      <div className="grid gap-4 md:grid-cols-3">
        <div className="card p-5">
          <Flame className="text-accent-ink" aria-hidden />
          <div className="mt-4 text-4xl font-bold">{p.streak} <span className="text-base font-medium text-muted">week{p.streak === 1 ? "" : "s"}</span></div>
          <p className="text-sm text-muted">Weekly streak — train at least once a week to keep it. Breaks pause it.</p>
        </div>
        <div className="card p-5 md:col-span-2">
          <div className="mb-3 flex justify-between"><h2 className="font-semibold">Weekly volume</h2><span className="text-xs text-muted">{weightUnit(u)}</span></div>
          <div className="flex h-32 items-end gap-2" role="img" aria-label="Weekly training volume for the last 8 weeks">
            {weeks.map((w) => (
              <div key={w} className="flex flex-1 flex-col items-center gap-1">
                <div className="w-full rounded-md bg-accent" style={{ height: `${Math.max(2, (volByWeek.get(w)! / maxVol) * 100)}%`, opacity: volByWeek.get(w) ? 1 : 0.15 }} title={`${formatNumber(fromKg(volByWeek.get(w)!, u))} ${weightUnit(u)}`} />
                <span className="text-[10px] text-muted">{w.slice(5).replace("-", "/")}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card p-5"><h2 className="mb-4 font-semibold">Activity</h2><ActivityHeatmap grid={p.grid} /></div>

      <section className="card p-5">
        <h2 className="mb-3 flex items-center gap-2 font-semibold"><Trophy size={18} className="text-accent-ink" aria-hidden /> Personal records</h2>
        {topPrs.length === 0 ? <p className="text-sm text-muted">Finish a couple of workouts and your bests will show up here.</p> : (
          <ul className="divide-y divide-line">
            {topPrs.map((r) => (
              <li key={r.id} className="flex items-center justify-between py-2 text-sm">
                <span className="flex items-center gap-3"><ExerciseThumb slug={r.exerciseSlug} size={36} className="rounded-lg" />{getExercise(r.exerciseSlug)?.name}</span>
                <span className="font-semibold">{r.kind === "max_reps" ? `${r.reps} reps` : `${formatWeight(r.weightKg, u)} × ${r.reps}`}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section id="breaks" className="card p-5">
        <h2 className="mb-1 flex items-center gap-2 font-semibold"><Coffee size={18} className="text-accent-ink" aria-hidden /> Breaks</h2>
        <p className="mb-4 text-sm text-muted">Going on holiday or need recovery time? A break pauses your streak instead of resetting it.</p>
        {p.onBreak ? (
          <div className="flex flex-wrap items-end gap-3">
            <p className="w-full text-sm">On a break until <b>{p.onBreak.endsOn}</b>{p.onBreak.reason ? ` · ${p.onBreak.reason}` : ""}.</p>
            <>
                <form action={adjustBreak.bind(null, p.onBreak.id)} className="flex items-end gap-2">
                  <label><span className="label">Change end date</span><input type="date" name="endsOn" min={today} defaultValue={p.onBreak.endsOn} className="input" /></label>
                  <button className="btn-secondary">Update</button>
                </form>
                <form action={endBreak.bind(null, p.onBreak.id)}><button className="btn-primary">I&apos;m back — end break</button></form>
              </>
          </div>
        ) : <BreakForm min={today} />}
      </section>

      <section>
        <h2 className="mb-3 font-semibold">History</h2>
        {p.sessions.length === 0 ? (
          <EmptyState title="No workouts yet" body="Your completed sessions will appear here." action={<Link href="/app/plan" className="btn-primary">Go to plan</Link>} />
        ) : (
          <ul className="space-y-3">
            {p.sessions.slice(0, 30).map((s) => {
              const ss = sets.filter((x) => x.sessionId === s.id && x.completed);
              return (
                <li key={s.id}>
                  <Link href={`/app/workout/${s.id}/summary`} className="card grid grid-cols-[1fr_auto] gap-2 p-4 transition hover:border-line-strong">
                    <div>
                      <div className="font-semibold">{s.title}</div>
                      <div className="text-xs text-muted">{s.completedAt!.toLocaleDateString("en", { weekday: "short", month: "short", day: "numeric" })}</div>
                    </div>
                    <div className="text-right text-sm text-muted">
                      <div>{formatDuration(s.durationSec ?? 0)} · {ss.length} sets</div>
                      <div>{formatNumber(fromKg(sessionVolume(ss), u))} {weightUnit(u)}</div>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
