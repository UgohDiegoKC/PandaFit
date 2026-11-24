import Link from "next/link";
import { RefreshCw, ShieldCheck, Sparkles } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getActivePlan } from "@/lib/plan/service";
import { getExercise } from "@/lib/catalog";
import { WEEKDAY_LONG, WEEKDAY_SHORT } from "@/lib/plan/types";
import { Badge, EmptyState, PageHeader } from "@/components/ui";
import { ExerciseThumb } from "@/components/exercise-figure";

export const metadata = { title: "Your plan" };

const SOURCE: Record<string, string> = { ai: "AI-generated", fallback: "Template plan", edited: "Edited by you" };

export default async function PlanPage({ searchParams }: { searchParams: Promise<{ new?: string; fallback?: string }> }) {
  const user = await requireUser();
  const sp = await searchParams;
  const plan = await getActivePlan(user.id);
  if (!plan) return <EmptyState title="No plan yet" body="Generate a plan from your profile." action={<Link className="btn-primary" href="/onboarding/generating">Generate plan</Link>} />;

  const trainingDays = new Set(plan.days.map((d) => d.weekday));

  return (
    <div className="space-y-6">
      {sp.new && (
        <div className="card flex items-start gap-3 border-accent/40 bg-accent-faint p-4">
          <Sparkles className="mt-0.5 shrink-0 text-accent-ink" aria-hidden />
          <div className="text-sm">
            <b>Your plan is ready.</b> Review it below — you can edit any day, swap exercises, or regenerate the whole plan.
            {sp.fallback && <span className="block text-muted">Built from our templates because the AI coach was unavailable.</span>}
          </div>
        </div>
      )}

      <PageHeader title={plan.name} subtitle={plan.summary} />

      <div className="flex flex-wrap items-center gap-2">
        <Badge tone="accent">{SOURCE[plan.source]}</Badge>
        <Badge>{plan.days.length} days / week</Badge>
        <Link href="/app/profile#training" className="ml-auto text-sm text-muted hover:text-fg">Edit answers</Link>
        <Link href="/onboarding/generating?regenerate=1" className="btn-secondary py-2"><RefreshCw size={14} aria-hidden /> Regenerate</Link>
      </div>

      <div className="grid grid-cols-7 gap-1.5" aria-label="Week overview">
        {WEEKDAY_SHORT.map((d, i) => (
          <div key={d} className={`rounded-xl py-2 text-center text-xs font-semibold ${trainingDays.has(i) ? "bg-accent text-on-accent" : "bg-surface-2 text-muted"}`}>
            {d}
          </div>
        ))}
      </div>

      <details className="card p-5" open={!!sp.new}>
        <summary className="cursor-pointer font-semibold">Why this plan fits you</summary>
        <p className="mt-3 text-sm leading-relaxed text-muted">{plan.rationale}</p>
        {plan.safetyNotes.length > 0 && (
          <ul className="mt-4 space-y-2">
            {plan.safetyNotes.map((n) => (
              <li key={n} className="flex gap-2 text-xs text-muted"><ShieldCheck size={14} className="mt-0.5 shrink-0 text-accent-ink" aria-hidden />{n}</li>
            ))}
          </ul>
        )}
      </details>

      <div className="grid gap-4 md:grid-cols-2">
        {plan.days.map((day) => (
          <Link key={day.id} href={`/app/plan/day/${day.id}`} className="card block p-5 transition hover:border-line-strong">
            <div className="flex items-baseline justify-between">
              <span className="eyebrow">{WEEKDAY_LONG[day.weekday]}</span>
              <span className="text-xs text-muted">~{day.estMinutes} min</span>
            </div>
            <h2 className="mt-1 text-xl font-bold">{day.title}</h2>
            <p className="text-sm text-muted">{day.focus}</p>
            <ul className="mt-4 divide-y divide-line">
              {day.exercises.map((e) => (
                <li key={e.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                  <span className="flex min-w-0 items-center gap-3"><ExerciseThumb slug={e.exerciseSlug} size={36} className="rounded-lg" /><span className="truncate">{getExercise(e.exerciseSlug)?.name ?? e.exerciseSlug}</span></span>
                  <span className="shrink-0 text-muted">{e.sets} × {e.repsMin === e.repsMax ? e.repsMin : `${e.repsMin}–${e.repsMax}`}</span>
                </li>
              ))}
            </ul>
          </Link>
        ))}
      </div>
    </div>
  );
}
