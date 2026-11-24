import { Crown } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { myBookings, openSlots } from "@/lib/coach";
import { getPrefs } from "@/lib/notify/service";
import { formatInZone, localParts } from "@/lib/tz";
import { PageHeader } from "@/components/ui";
import { BookingPanel } from "./panel";

export const metadata = { title: "Coach check-ins" };

export default async function CoachPage() {
  const user = await requireUser();
  if (!user.isPro) {
    return (
      <div className="mx-auto max-w-xl">
        <PageHeader title="Coach check-ins" />
        <div className="card p-6">
          <Crown className="text-accent-ink" aria-hidden />
          <h2 className="mt-3 text-xl font-bold">A real coach in your corner</h2>
          <p className="mt-2 text-sm text-muted">PandaFit Pro members book weekly or bi-weekly video check-ins with a coach to review form, progress and the plan.</p>
          <p className="mt-4 rounded-xl bg-surface-2 p-3 text-xs text-muted">Pro is invite-only during the beta. Ask the PandaFit team to upgrade your account.</p>
        </div>
      </div>
    );
  }

  const { timezone } = await getPrefs(user.id);
  const [mine, open] = await Promise.all([myBookings(user.id), openSlots()]);
  const fmtTime = (d: Date) => formatInZone(d, timezone, { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Coach check-ins" subtitle={`Times shown in ${timezone}`} />
      <BookingPanel
        upcoming={mine.map((m) => ({ id: m.b.id, seriesId: m.b.seriesId, cadence: m.b.cadence, coachName: m.coachName.split(" ")[0], label: formatInZone(m.startsAt, timezone, { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }), durationMin: m.durationMin }))}
        slots={open.map((s) => {
          const p = localParts(s.startsAt, timezone);
          return { id: s.id, date: p.date, time: fmtTime(s.startsAt), durationMin: s.durationMin, coachName: s.coachName.split(" ")[0], dayLabel: formatInZone(s.startsAt, timezone, { weekday: "short" }).split(" ")[0], dayNum: p.day };
        })}
      />
    </div>
  );
}
