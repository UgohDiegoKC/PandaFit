import Link from "next/link";
import { redirect } from "next/navigation";
import { Dumbbell, Flame, LineChart, Sparkles } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { Logo } from "@/components/ui";
import { ExerciseThumb } from "@/components/exercise-figure";

export default async function Landing() {
  const user = await getCurrentUser();
  if (user) redirect(user.onboardedAt ? "/app" : "/onboarding");

  const features = [
    { Icon: Sparkles, title: "A plan built for you", body: "Tell us your goal, schedule and session length. PandaFit's AI coach designs your week in seconds." },
    { Icon: Dumbbell, title: "Log every set, calmly", body: "Sets, reps, weight and rest timers in one tap — with last time and your best always in view." },
    { Icon: Flame, title: "Streaks that respect rest", body: "Weekly streaks, planned breaks that don't punish you, and a nudge when it's time to come back." },
    { Icon: LineChart, title: "See the progress", body: "Personal records, weekly volume and a full history of every workout." },
  ];

  return (
    <main className="mx-auto flex min-h-dvh max-w-6xl flex-col px-5 py-6 md:px-8">
      <nav className="flex items-center justify-between">
        <Logo className="text-lg" />
        <div className="flex gap-2">
          <Link href="/sign-in" className="btn-ghost">Sign in</Link>
          <Link href="/sign-up" className="btn-primary">Get started</Link>
        </div>
      </nav>

      <section className="grid flex-1 items-center gap-10 py-14 md:grid-cols-2">
        <div>
          <p className="eyebrow text-accent-ink">AI-powered training</p>
          <h1 className="mt-3 text-5xl font-bold leading-[1.02] tracking-tight md:text-6xl">
            Form matters.<br />Reps count.<br /><span className="text-accent-ink">Plans fit you.</span>
          </h1>
          <p className="mt-5 max-w-md text-lg text-muted">
            Your personal gym program, generated from your goals and schedule — then logged, tracked and adjusted as you get stronger.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/sign-up" className="btn-primary px-7 text-base">Build my plan</Link>
            <Link href="/sign-in" className="btn-secondary px-7 text-base">I have an account</Link>
          </div>
          <p className="mt-4 text-xs text-muted">General fitness guidance, not medical advice. For adults 18+.</p>
        </div>

        <div className="card relative overflow-hidden p-5">
          <div className="eyebrow">Today · Upper A</div>
          <div className="mt-2 flex items-center gap-3"><ExerciseThumb slug="dumbbell-bench-press" size={56} /><span className="text-2xl font-bold">Dumbbell Bench Press</span></div>
          <div className="mt-4 flex items-center gap-3 rounded-2xl bg-surface-2 px-4 py-3">
            <span className="grid size-9 place-items-center rounded-xl bg-accent text-on-accent">🏆</span>
            <span className="flex-1 text-sm font-medium">New personal record</span>
            <span className="text-sm font-semibold">32 kg × 10</span>
          </div>
          {[24, 28, 32].map((w, i) => (
            <div key={w} className="relative mt-3 flex items-center gap-4 overflow-hidden rounded-2xl border border-line bg-surface-2 px-4 py-4">
              <span className="grid size-6 place-items-center rounded-full bg-accent text-xs text-on-accent">✓</span>
              <span className="text-muted"><b className="text-fg">{w}</b> kg × <b className="text-fg">10</b> reps</span>
              <span className="pointer-events-none absolute right-3 text-5xl font-black text-ghost">0{i + 1}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-4 pb-10 sm:grid-cols-2 lg:grid-cols-4">
        {features.map(({ Icon, title, body }) => (
          <div key={title} className="card p-5">
            <Icon className="text-accent-ink" size={22} aria-hidden />
            <h2 className="mt-3 font-semibold">{title}</h2>
            <p className="mt-1 text-sm text-muted">{body}</p>
          </div>
        ))}
      </section>
    </main>
  );
}
