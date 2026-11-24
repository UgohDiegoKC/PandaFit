/**
 * Pure reminder planner: given "now" and a user's current state, which reminders SHOULD exist?
 * The job enqueues these (idempotently by dedupeKey) and, at send time, re-runs the planner —
 * anything no longer in the desired set (break moved, plan changed, booking cancelled) is skipped as stale.
 */
import { addDays, localParts, zonedToUtc } from "../tz";

export type ReminderKind = "gym_prep" | "break_ending" | "checkin_reminder";

export interface PlannerPrefs {
  timezone: string;
  gymReminders: boolean;
  gymTimeMin: number;
  gymLeadMin: number;
  breakReminders: boolean;
  checkinReminders: boolean;
}

export interface PlannerState {
  userId: string;
  gymWeekdays: number[];
  breaks: { id: string; startsOn: string; endsOn: string; endedEarlyOn?: string | null }[];
  bookings: { id: string; startsAt: Date; status: "confirmed" | "cancelled" }[];
}

export interface DesiredReminder {
  kind: ReminderKind;
  dedupeKey: string;
  sendAt: Date;
  /** After this instant the reminder is pointless (e.g. the session already started). */
  expiresAt: Date;
  title: string;
  body: string;
  url: string;
}

export const HORIZON_MS = 48 * 3600_000;
export const BREAK_REMINDER_DAYS_BEFORE = 2;
export const BREAK_REMINDER_TIME = 9 * 60; // 09:00 local
export const CHECKIN_LEAD_MS = 24 * 3600_000;

const effectiveEnd = (b: PlannerState["breaks"][number]) => (b.endedEarlyOn && b.endedEarlyOn < b.endsOn ? b.endedEarlyOn : b.endsOn);
const onBreak = (date: string, breaks: PlannerState["breaks"]) => breaks.some((b) => date >= b.startsOn && date <= effectiveEnd(b));

export function desiredReminders(now: Date, prefs: PlannerPrefs, s: PlannerState): DesiredReminder[] {
  const out: DesiredReminder[] = [];
  const tz = prefs.timezone;
  const today = localParts(now, tz).date;
  const horizon = now.getTime() + HORIZON_MS;

  if (prefs.gymReminders && s.gymWeekdays.length) {
    for (let i = 0; i <= 3; i++) {
      const date = addDays(today, i);
      const weekday = new Date(date + "T12:00:00Z").getUTCDay();
      if (!s.gymWeekdays.includes(weekday) || onBreak(date, s.breaks)) continue;
      const gymStart = zonedToUtc(date, prefs.gymTimeMin, tz);
      const sendAt = zonedToUtc(date, Math.max(0, prefs.gymTimeMin - prefs.gymLeadMin), tz);
      if (gymStart <= now || sendAt.getTime() > horizon) continue;
      out.push({
        kind: "gym_prep", dedupeKey: `gym:${s.userId}:${date}`, sendAt, expiresAt: gymStart,
        title: "Gym day 💪", body: "Your session starts soon — pack your bag and grab some water.", url: "/app",
      });
    }
  }

  if (prefs.breakReminders) {
    for (const b of s.breaks) {
      if (b.endedEarlyOn && b.endedEarlyOn < b.endsOn) continue; // already back
      const remindOn = addDays(b.endsOn, -BREAK_REMINDER_DAYS_BEFORE);
      if (remindOn < b.startsOn) continue; // break too short for a heads-up
      const sendAt = zonedToUtc(remindOn, BREAK_REMINDER_TIME, tz);
      const expiresAt = zonedToUtc(addDays(b.endsOn, 1), 0, tz);
      if (expiresAt <= now || sendAt.getTime() > horizon) continue;
      out.push({
        kind: "break_ending", dedupeKey: `break:${b.id}:${b.endsOn}`, sendAt, expiresAt,
        title: "Your break ends soon", body: `You're back on ${b.endsOn}. Your plan and streak are waiting for you.`, url: "/app/plan",
      });
    }
  }

  if (prefs.checkinReminders) {
    for (const bk of s.bookings) {
      if (bk.status !== "confirmed" || bk.startsAt <= now) continue;
      const sendAt = new Date(bk.startsAt.getTime() - CHECKIN_LEAD_MS);
      if (sendAt.getTime() > horizon) continue;
      out.push({
        kind: "checkin_reminder", dedupeKey: `checkin:${bk.id}:${bk.startsAt.getTime()}`, sendAt, expiresAt: bk.startsAt,
        title: "Coach check-in tomorrow", body: "Your Pro check-in is coming up. Jot down anything you want to discuss.", url: "/app/coach",
      });
    }
  }

  return out;
}
