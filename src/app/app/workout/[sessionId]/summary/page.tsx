import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireUser } from "@/lib/auth";
import { getExercise, MUSCLE_LABEL, type Muscle } from "@/lib/catalog";
import { sessionVolume } from "@/lib/progress";
import { formatDuration, formatNumber, fromKg, weightUnit } from "@/lib/units";
import { Badge } from "@/components/ui";
import { ExerciseThumb } from "@/components/exercise-figure";
import { PrCelebration } from "./pr-celebration";

export const metadata = { title: "Workout complete" };

export default async function SummaryPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const user = await requireUser();
  const { sessionId } = await params;
  const session = await db.query.workoutSessions.findFirst({ where: and(eq(schema.workoutSessions.id, sessionId), eq(schema.workoutSessions.userId, user.id)) });
  if (!session?.completedAt) notFound();
  const sets = await db.select().from(schema.setLogs).where(eq(schema.setLogs.sessionId, session.id));
  const done = sets.filter((s) => s.completed);

  const primary = new Map<Muscle, number>();
  const secondary = new Map<Muscle, number>();
  for (const s of done) {
    const ex = getExercise(s.exerciseSlug);
    ex?.primary.forEach((m) => primary.set(m, (primary.get(m) ?? 0) + 1));
    ex?.secondary.forEach((m) => secondary.set(m, (secondary.get(m) ?? 0) + 1));
  }
  for (const m of primary.keys()) secondary.delete(m);
  const byExercise = [...new Set(done.map((s) => s.exerciseSlug))];
  const u = user.unitSystem;

  return (
    <div className="mx-auto max-w-lg space-y-5">
      <div>
        <span className="eyebrow">{session.completedAt.toLocaleDateString("en", { weekday: "long", month: "short", day: "numeric" })}</span>
        <h1 className="text-3xl font-bold">{session.title} done</h1>
      </div>

      <PrCelebration sessionId={session.id} unit={u} />

      <div className="card grid grid-cols-3 divide-x divide-line">
        <div className="px-4 py-3"><div className="eyebrow">Duration</div><div className="mt-1 text-xl font-semibold">{formatDuration(session.durationSec ?? 0)}</div></div>
        <div className="px-4 py-3"><div className="eyebrow">Volume</div><div className="mt-1 text-xl font-semibold">{formatNumber(fromKg(sessionVolume(done), u))} <span className="text-sm text-muted">{weightUnit(u)}</span></div></div>
        <div className="px-4 py-3"><div className="eyebrow">Sets</div><div className="mt-1 text-xl font-semibold">{done.length}</div></div>
      </div>

      <div className="card space-y-4 p-5">
        <div>
          <div className="mb-2 text-sm font-semibold">Primary</div>
          <div className="flex flex-wrap gap-2">{[...primary.keys()].map((m) => <Badge key={m} tone="accent">{MUSCLE_LABEL[m]}</Badge>)}</div>
        </div>
        {secondary.size > 0 && (
          <div>
            <div className="mb-2 text-sm font-semibold">Secondary</div>
            <div className="flex flex-wrap gap-2">{[...secondary.keys()].map((m) => <Badge key={m}>{MUSCLE_LABEL[m]}</Badge>)}</div>
          </div>
        )}
      </div>

      <ul className="card divide-y divide-line">
        {byExercise.map((slug) => {
          const ss = done.filter((s) => s.exerciseSlug === slug).sort((a, b) => a.setNumber - b.setNumber);
          return (
            <li key={slug} className="flex items-center justify-between gap-3 p-4 text-sm">
              <span className="flex items-center gap-3 font-medium"><ExerciseThumb slug={slug} size={40} />{getExercise(slug)?.name}</span>
              <span className="text-right text-muted">{ss.map((s) => `${Math.round(fromKg(s.weightKg, u) * 10) / 10}×${s.reps}`).join(" · ")}</span>
            </li>
          );
        })}
      </ul>

      <Link href="/app" className="btn-primary w-full py-4 text-base">Back home</Link>
    </div>
  );
}
