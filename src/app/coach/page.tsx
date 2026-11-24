import clsx from "clsx";
import { requireRole } from "@/lib/auth";
import { coachSchedule } from "@/lib/coach";
import { getPrefs } from "@/lib/notify/service";
import { formatInZone, localParts } from "@/lib/tz";
import { StaffShell } from "@/components/staff-shell";
import { Badge, PageHeader } from "@/components/ui";
import { AddSlotsForm, SlotActions } from "./client";

export const metadata = { title: "Coach schedule" };

export default async function CoachSchedulePage() {
  const coach = await requireRole("coach", "admin");
  const { timezone } = await getPrefs(coach.id);
  const slots = await coachSchedule(coach.id);
  const byDay = new Map<string, typeof slots>();
  for (const s of slots) {
    const d = localParts(s.startsAt, timezone).date;
    byDay.set(d, [...(byDay.get(d) ?? []), s]);
  }
  const booked = slots.filter((s) => s.booking).length;

  return (
    <StaffShell role={coach.role}>
      <PageHeader title="Your availability" subtitle={`${slots.length} upcoming slots · ${booked} booked · times in ${timezone}`} />
      <section className="card mb-6 p-5">
        <h2 className="mb-3 font-semibold">Add availability</h2>
        <AddSlotsForm minDate={localParts(new Date(), timezone).date} />
      </section>
      {byDay.size === 0 ? <p className="text-sm text-muted">No upcoming slots yet.</p> : (
        <div className="space-y-4">
          {[...byDay.entries()].map(([day, list]) => (
            <section key={day} className="card p-4">
              <h3 className="eyebrow mb-2">{formatInZone(list[0].startsAt, timezone, { weekday: "long", day: "numeric", month: "long" })}</h3>
              <ul className="divide-y divide-line">
                {list.map((s) => (
                  <li key={s.id} className={clsx("flex items-center gap-3 py-2.5", s.blocked && "opacity-50")}>
                    <span className="w-28 font-semibold tabular-nums">{formatInZone(s.startsAt, timezone, { hour: "2-digit", minute: "2-digit" })}</span>
                    <span className="text-sm text-muted">{s.durationMin} min</span>
                    <span className="flex-1">
                      {s.booking ? <Badge tone="accent">{s.booking.firstName} · {s.booking.cadence}</Badge> : s.blocked ? <Badge>Blocked</Badge> : <Badge>Open</Badge>}
                    </span>
                    <SlotActions id={s.id} blocked={s.blocked} booked={!!s.booking} />
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </StaffShell>
  );
}
