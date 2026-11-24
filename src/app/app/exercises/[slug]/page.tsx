import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { AnimatedFigure } from "@/components/exercise-figure-animated";
import { requireUser } from "@/lib/auth";
import { getExercise, MUSCLE_LABEL } from "@/lib/catalog";
import { getPRs } from "@/lib/queries";
import { formatWeight } from "@/lib/units";
import { Badge } from "@/components/ui";
import { ExerciseThumb } from "@/components/exercise-figure";

export default async function ExercisePage({ params }: { params: Promise<{ slug: string }> }) {
  const user = await requireUser();
  const { slug } = await params;
  const ex = getExercise(slug);
  if (!ex) notFound();
  const prs = await getPRs(user.id, [slug]);
  const best = prs.find((p) => p.kind === "max_weight");
  const e1rm = prs.find((p) => p.kind === "est_1rm");

  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/app/plan" className="mb-4 inline-flex items-center gap-1 text-sm text-muted hover:text-fg"><ChevronLeft size={16} /> Plan</Link>

      <AnimatedFigure slug={ex.slug} name={ex.name} />

      <h1 className="mt-6 text-3xl font-bold">{ex.name}</h1>
      <div className="mt-3 flex flex-wrap gap-2">
        {ex.primary.map((m) => <Badge key={m} tone="accent">{MUSCLE_LABEL[m]}</Badge>)}
        {ex.secondary.map((m) => <Badge key={m}>{MUSCLE_LABEL[m]}</Badge>)}
        <Badge>{ex.equipment.join(" · ").replace(/_/g, " ")}</Badge>
      </div>

      {(best || e1rm) && (
        <div className="card mt-5 grid grid-cols-2 divide-x divide-line">
          <div className="px-4 py-3"><div className="eyebrow">Heaviest</div><div className="mt-1 text-xl font-semibold">{best ? `${formatWeight(best.weightKg, user.unitSystem)} × ${best.reps}` : "—"}</div></div>
          <div className="px-4 py-3"><div className="eyebrow">Est. 1RM</div><div className="mt-1 text-xl font-semibold">{e1rm ? formatWeight(e1rm.value, user.unitSystem) : "—"}</div></div>
        </div>
      )}

      <section id="how-to" className="mt-6">
        <h2 className="font-semibold">How to do it</h2>
        <ol className="mt-3 space-y-3">
          {ex.instructions.map((step, i) => (
            <li key={i} className="flex gap-3 text-sm">
              <span className="grid size-6 shrink-0 place-items-center rounded-full bg-accent text-xs font-bold text-on-accent">{i + 1}</span>
              <span className="pt-0.5">{step}</span>
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-6">
        <h2 className="font-semibold">Coaching cues</h2>
        <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-muted">{ex.cues.map((c) => <li key={c}>{c}</li>)}</ul>
      </section>

      {ex.substitutions.length > 0 && (
        <section className="mt-6">
          <h2 className="font-semibold">Alternatives</h2>
          <div className="mt-2 flex flex-wrap gap-2">
            {ex.substitutions.map((s) => getExercise(s)).filter(Boolean).map((s) => (
              <Link key={s!.slug} href={`/app/exercises/${s!.slug}`} className="flex items-center gap-2 rounded-xl bg-surface-2 py-1 pl-1 pr-3 text-sm hover:text-accent-ink"><ExerciseThumb slug={s!.slug} size={32} className="rounded-lg bg-surface-3" />{s!.name}</Link>
            ))}
          </div>
        </section>
      )}
      <p className="mt-8 text-xs text-muted">Stop if you feel sharp pain, dizziness or chest discomfort. This is general guidance, not medical advice.</p>
    </div>
  );
}
