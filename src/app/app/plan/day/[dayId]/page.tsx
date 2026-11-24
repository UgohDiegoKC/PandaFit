import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Clock, Play } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getActivePlan } from "@/lib/plan/service";
import { CATALOG, getExercise, isTimed, MUSCLE_LABEL } from "@/lib/catalog";
import { WEEKDAY_LONG } from "@/lib/plan/types";
import { getLastPerformance } from "@/lib/queries";
import { formatWeight } from "@/lib/units";
import { startWorkout } from "../../actions";
import { DayEditor } from "./editor";
import { ExerciseThumb } from "@/components/exercise-figure";

export default async function DayPage({ params, searchParams }: { params: Promise<{ dayId: string }>; searchParams: Promise<{ edit?: string; saved?: string }> }) {
  const user = await requireUser();
  const { dayId } = await params;
  const sp = await searchParams;
  const plan = await getActivePlan(user.id);
  const day = plan?.days.find((d) => d.id === dayId);
  if (!day) notFound();
  const last = await getLastPerformance(user.id, day.exercises.map((e) => e.exerciseSlug));

  if (sp.edit) {
    return (
      <DayEditor
        dayId={day.id}
        title={day.title}
        initial={day.exercises.map((e) => ({ slug: e.exerciseSlug, sets: e.sets, repsMin: e.repsMin, repsMax: e.repsMax, restSec: e.restSec, weightGuidance: e.weightGuidance, notes: e.notes }))}
        catalog={CATALOG.map((c) => ({ slug: c.slug, name: c.name, primary: c.primary.map((m) => MUSCLE_LABEL[m]).join(", "), substitutions: c.substitutions }))}
      />
    );
  }

  return (
    <div>
      <Link href="/app/plan" className="mb-4 inline-flex items-center gap-1 text-sm text-muted hover:text-fg"><ChevronLeft size={16} /> Plan</Link>
      {sp.saved && <p className="card mb-4 border-accent/40 bg-accent-faint p-3 text-sm">Changes saved and safety-checked.</p>}
      <span className="eyebrow block">{WEEKDAY_LONG[day.weekday]}</span>
      <h1 className="text-4xl font-bold tracking-tight">{day.title}</h1>
      <p className="mt-1 flex items-center gap-2 text-sm text-muted"><Clock size={14} aria-hidden /> ~{day.estMinutes} min · {day.focus}</p>

      <ol className="mt-6 space-y-3">
        {day.exercises.map((e, i) => {
          const ex = getExercise(e.exerciseSlug);
          const lp = last.get(e.exerciseSlug);
          const timed = isTimed(e.exerciseSlug);
          return (
            <li key={e.id}>
              <Link href={`/app/exercises/${e.exerciseSlug}`} className="card relative flex items-center gap-4 overflow-hidden p-4 transition hover:border-line-strong">
                <span className="relative">
                  <ExerciseThumb slug={e.exerciseSlug} size={64} />
                  <span className="absolute -left-1.5 -top-1.5 grid size-5 place-items-center rounded-full bg-accent text-[11px] font-bold text-on-accent">{i + 1}</span>
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold">{ex?.name ?? e.exerciseSlug}</div>
                  <div className="text-sm text-muted">
                    {e.sets} sets × {e.repsMin === e.repsMax ? e.repsMin : `${e.repsMin}–${e.repsMax}`} {timed ? "sec" : "reps"} · rest {e.restSec}s
                  </div>
                  <div className="mt-1 text-xs text-muted">{lp ? `Last time: ${formatWeight(lp.weightKg, user.unitSystem)} × ${lp.reps}` : e.weightGuidance}</div>
                </div>
              </Link>
            </li>
          );
        })}
      </ol>

      <div className="sticky bottom-24 mt-8 flex gap-3 md:bottom-6">
        <Link href={`?edit=1`} className="btn-secondary flex-1">Edit day</Link>
        <form action={startWorkout.bind(null, day.id)} className="flex-[2]">
          <button className="btn-primary w-full text-base"><Play size={16} aria-hidden /> Start workout</button>
        </form>
      </div>
    </div>
  );
}
