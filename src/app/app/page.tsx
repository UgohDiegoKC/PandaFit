import Link from "next/link";
import { ArrowRight, CalendarClock, Coffee, Flame, Salad } from "lucide-react";
import { myBookings } from "@/lib/coach";
import { getPrefs } from "@/lib/notify/service";
import { formatInZone } from "@/lib/tz";
import { requireUser } from "@/lib/auth";
import { getActivePlan } from "@/lib/plan/service";
import { getProgressSummary } from "@/lib/queries";
import { isoDate } from "@/lib/progress";
import { WEEKDAY_LONG } from "@/lib/plan/types";
import { formatNumber, fromKg, weightUnit } from "@/lib/units";
import { ActivityHeatmap } from "@/components/heatmap";
import { EmptyState, Ring } from "@/components/ui";

export const metadata = { title: "Home" };

export default async function Dashboard() {
  const user = await requireUser();
  const [plan, progress, bookings, prefs] = await Promise.all([getActivePlan(user.id), getProgressSummary(user.id), user.isPro ? myBookings(user.id) : [], getPrefs(user.id)]);
  const nextCheckin = bookings[0];
  const today = new Date();
  const todayDone = progress.sessions.some((s) => isoDate(s.completedAt!) === isoDate(today));

  const days = plan?.days ?? [];
  const wd = today.getDay();
  const ordered = [...days].sort((a, b) => ((a.weekday - wd + 7) % 7) - ((b.weekday - wd + 7) % 7));
  const next = ordered.find((d) => !(d.weekday === wd && todayDone)) ?? ordered[0];
  const isToday = next && next.weekday === wd && !todayDone;
  const unit = user.unitSystem;

  return (
    <div className="space-y-4">
      <header className="mb-2 flex items-end justify-between">
        <div>
          <p className="text-sm text-muted">{today.toLocaleDateString("en", { weekday: "long", day: "numeric", month: "short" })}</p>
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl">Hi, {user.name.split(" ")[0]}</h1>
        </div>
      </header>

      {progress.onBreak && (
        <div className="card flex items-center gap-3 p-4">
          <Coffee className="text-accent-ink" aria-hidden />
          <p className="flex-1 text-sm">You&apos;re on a break until <b>{progress.onBreak.endsOn}</b>. Your streak is paused, not lost.</p>
          <Link href="/app/progress#breaks" className="text-sm font-semibold text-accent-ink">Manage</Link>
        </div>
      )}

      {!plan ? (
        <EmptyState title="No plan yet" body="Let your coach build a plan from your profile." action={<Link href="/onboarding/generating" className="btn-primary">Generate my plan</Link>} />
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <Link href={`/app/plan/day/${next.id}`} className="card col-span-2 flex flex-col justify-between p-5 transition hover:border-line-strong md:row-span-2">
            <div className="flex items-start justify-between">
              <Ring value={next.position + 1} max={days.length} label={next.position + 1} />
              <span className="eyebrow">{isToday ? "Today" : "Up next"}</span>
            </div>
            <div className="mt-10">
              <div className="text-2xl font-bold">{next.title}</div>
              <div className="text-sm text-muted">{WEEKDAY_LONG[next.weekday]} · {next.exercises.length} exercises · ~{next.estMinutes} min</div>
              <div className="mt-1 text-sm text-muted">{next.focus}</div>
              <span className="btn-primary mt-5 w-full">{isToday ? "Start workout" : "View workout"} <ArrowRight size={16} aria-hidden /></span>
            </div>
          </Link>

          <div className="card flex flex-col justify-between p-5">
            <Flame className="text-accent-ink" aria-hidden />
            <div className="mt-6">
              <div className="text-4xl font-bold">{progress.streak}<span className="ml-1 text-base font-medium text-muted">wk</span></div>
              <div className="text-sm text-muted">Weekly streak</div>
            </div>
          </div>

          <div className="card flex flex-col justify-between p-5">
            <div className="eyebrow">This week</div>
            <div className="mt-6">
              <div className="text-4xl font-bold">{progress.workouts7d}<span className="ml-1 text-base font-medium text-muted">/ {days.length}</span></div>
              <div className="text-sm text-muted">Workouts (7 days)</div>
            </div>
          </div>

          <div className="card col-span-2 flex items-center justify-between p-5">
            <div>
              <div className="font-semibold">Volume lifted</div>
              <div className="text-sm text-muted">Last 7 days</div>
            </div>
            <div className="text-3xl font-bold">{formatNumber(fromKg(progress.volume7d, unit))}<span className="ml-1 text-base font-medium text-muted">{weightUnit(unit)}</span></div>
          </div>
        </div>
      )}

      <div className="card p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-semibold">Activity</h2>
          <Link href="/app/progress" className="rounded-full bg-accent px-3 py-1 text-xs font-semibold text-on-accent">View all</Link>
        </div>
        <ActivityHeatmap grid={progress.grid} />
      </div>

      {user.isPro && (
        <Link href="/app/coach" className="card flex items-center gap-4 p-5 transition hover:border-line-strong">
          <span className="grid size-11 place-items-center rounded-2xl bg-accent text-on-accent"><CalendarClock aria-hidden /></span>
          <div className="flex-1">
            <div className="font-semibold">Coach check-in</div>
            <div className="text-sm text-muted">{nextCheckin ? `Next: ${formatInZone(nextCheckin.startsAt, prefs.timezone, { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })} with ${nextCheckin.coachName.split(" ")[0]}` : "Book a weekly or bi-weekly check-in"}</div>
          </div>
          <ArrowRight size={18} className="text-muted" aria-hidden />
        </Link>
      )}

      <Link href="/app/nutrition" className="card flex items-center gap-4 p-5 transition hover:border-line-strong">
        <span className="grid size-11 place-items-center rounded-2xl bg-accent-soft text-accent-ink"><Salad aria-hidden /></span>
        <div className="flex-1">
          <div className="font-semibold">Fuel for your goal</div>
          <div className="text-sm text-muted">Simple food sources that support your training</div>
        </div>
        <ArrowRight size={18} className="text-muted" aria-hidden />
      </Link>
    </div>
  );
}
