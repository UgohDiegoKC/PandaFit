import "server-only";
import { and, eq, inArray, isNotNull, lt, lte } from "drizzle-orm";
import { db, schema } from "@/db";
import { track } from "../analytics";
import { sendEmail } from "../email";
import { appUrl } from "../app-url";
import { deferPastQuietHours } from "../tz";
import { desiredReminders, type PlannerPrefs } from "./planner";
import { pushConfigured, sendPush } from "./push";

type Prefs = typeof schema.notificationPrefs.$inferSelect;
type Notification = typeof schema.notifications.$inferSelect;

export const MAX_ATTEMPTS = 3;

export async function getPrefs(userId: string): Promise<Prefs> {
  const row = await db.query.notificationPrefs.findFirst({ where: eq(schema.notificationPrefs.userId, userId) });
  if (row) return row;
  await db.insert(schema.notificationPrefs).values({ userId }).onConflictDoNothing();
  return (await db.query.notificationPrefs.findFirst({ where: eq(schema.notificationPrefs.userId, userId) }))!;
}

async function plannerState(userId: string) {
  const plan = await db.query.plans.findFirst({ where: and(eq(schema.plans.userId, userId), eq(schema.plans.status, "active")) });
  const days = plan ? await db.select({ weekday: schema.planDays.weekday }).from(schema.planDays).where(eq(schema.planDays.planId, plan.id)) : [];
  const [brks, bookings] = await Promise.all([
    db.select().from(schema.breaks).where(eq(schema.breaks.userId, userId)),
    db.select({ id: schema.proBookings.id, status: schema.proBookings.status, startsAt: schema.coachSlots.startsAt })
      .from(schema.proBookings).innerJoin(schema.coachSlots, eq(schema.proBookings.slotId, schema.coachSlots.id))
      .where(and(eq(schema.proBookings.userId, userId), eq(schema.proBookings.status, "confirmed"))),
  ]);
  return { userId, gymWeekdays: days.map((d) => d.weekday), breaks: brks, bookings };
}

const plannerPrefs = (p: Prefs): PlannerPrefs => ({
  timezone: p.timezone, gymReminders: p.gymReminders, gymTimeMin: p.gymTimeMin, gymLeadMin: p.gymLeadMin,
  breakReminders: p.breakReminders, checkinReminders: p.checkinReminders,
});

/** Enqueue whatever reminders this user should get in the next 48h. Safe to call repeatedly. */
export async function scheduleForUser(userId: string, now = new Date()) {
  const prefs = await getPrefs(userId);
  const desired = desiredReminders(now, plannerPrefs(prefs), await plannerState(userId));
  if (!desired.length) return 0;
  const rows = await db.insert(schema.notifications)
    .values(desired.map((d) => ({ userId, kind: d.kind, dedupeKey: d.dedupeKey, sendAt: d.sendAt, title: d.title, body: d.body, url: d.url })))
    .onConflictDoNothing({ target: schema.notifications.dedupeKey })
    .returning({ id: schema.notifications.id });
  return rows.length;
}

/** Transactional message (booking confirmations etc.) — goes out on the next dispatch, no stale check. */
export async function enqueueNow(userId: string, n: { title: string; body: string; url: string; dedupeKey: string }) {
  await db.insert(schema.notifications).values({ userId, kind: "booking_update", sendAt: new Date(), ...n }).onConflictDoNothing({ target: schema.notifications.dedupeKey });
}

async function deliver(n: Notification, prefs: Prefs, email: string): Promise<{ channels: string[]; error?: string }> {
  const channels: string[] = [];
  const errors: string[] = [];
  const payload = { title: n.title, body: n.body, url: n.url };

  if (prefs.pushEnabled && pushConfigured()) {
    const subs = await db.select().from(schema.pushSubscriptions).where(eq(schema.pushSubscriptions.userId, n.userId));
    for (const sub of subs) {
      const r = await sendPush(sub, payload);
      if (r === "sent") channels.push("push");
      else if (r === "gone") await db.delete(schema.pushSubscriptions).where(eq(schema.pushSubscriptions.endpoint, sub.endpoint));
      else errors.push("push failed");
    }
  }

  // Email is the backup channel, and always used for booking-related messages.
  const important = n.kind === "booking_update" || n.kind === "checkin_reminder";
  if (prefs.emailEnabled && (important || !channels.includes("push"))) {
    const r = await sendEmail({
      to: email,
      subject: n.title.replace(/[^\p{L}\p{N}\s'’:,.!?-]/gu, "").trim(),
      text: `${n.body}\n\nOpen PandaFit: ${appUrl()}${n.url}\n\nManage notifications: ${appUrl()}/app/profile#notifications`,
    });
    if (r.ok) channels.push("email");
    else errors.push(r.error);
  }
  return { channels: [...new Set(channels)], error: errors.join("; ") || undefined };
}

export interface JobSummary { scheduled: number; sent: number; skipped: number; deferred: number; failed: number; retried: number }

/** Sends everything that's due. Re-checks relevance and quiet hours at send time. */
export async function dispatchDue(now = new Date(), userId?: string): Promise<Omit<JobSummary, "scheduled">> {
  const summary = { sent: 0, skipped: 0, deferred: 0, failed: 0, retried: 0 };
  const due = await db.select().from(schema.notifications)
    .where(and(eq(schema.notifications.status, "pending"), lte(schema.notifications.sendAt, now), userId ? eq(schema.notifications.userId, userId) : undefined))
    .limit(500);
  if (!due.length) return summary;

  const userIds = [...new Set(due.map((d) => d.userId))];
  const users = new Map((await db.select().from(schema.users).where(inArray(schema.users.id, userIds))).map((u) => [u.id, u]));

  for (const uid of userIds) {
    const user = users.get(uid);
    if (!user) continue;
    const prefs = await getPrefs(uid);
    const desired = new Map(desiredReminders(now, plannerPrefs(prefs), await plannerState(uid)).map((d) => [d.dedupeKey, d]));

    for (const n of due.filter((d) => d.userId === uid)) {
      const mark = (patch: Partial<Notification>) => db.update(schema.notifications).set(patch).where(eq(schema.notifications.id, n.id));

      if (n.kind !== "booking_update") {
        const d = desired.get(n.dedupeKey);
        if (!d) { await mark({ status: "skipped", error: "stale: no longer relevant" }); summary.skipped++; continue; }
        const at = deferPastQuietHours(now, prefs.timezone, prefs.quietStartMin, prefs.quietEndMin);
        if (at > now) {
          if (at >= d.expiresAt) { await mark({ status: "skipped", error: "quiet hours until after it was useful" }); summary.skipped++; }
          else { await mark({ sendAt: at }); summary.deferred++; }
          continue;
        }
      }

      if (!prefs.emailEnabled && !prefs.pushEnabled) { await mark({ status: "skipped", error: "all channels off" }); summary.skipped++; continue; }

      const { channels, error } = await deliver(n, prefs, user.email);
      if (channels.length) {
        await mark({ status: "sent", sentAt: now, channels, attempts: n.attempts + 1, error: error ?? null });
        summary.sent++;
        for (const c of channels) await track("notification_sent", uid, { kind: n.kind, channel: c });
      } else if (n.attempts + 1 >= MAX_ATTEMPTS) {
        await mark({ status: "failed", attempts: n.attempts + 1, error: error ?? "no channel delivered" });
        summary.failed++;
      } else {
        // Exponential backoff: 5, 10 min…
        await mark({ attempts: n.attempts + 1, sendAt: new Date(now.getTime() + 5 * 60_000 * 2 ** n.attempts), error: error ?? "no channel delivered" });
        summary.retried++;
      }
    }
  }
  return summary;
}

/** The scheduled job: plan → dispatch → housekeeping. Run every ~5 minutes. */
export async function runReminderJob(now = new Date()): Promise<JobSummary> {
  const users = await db.select({ id: schema.users.id }).from(schema.users).where(isNotNull(schema.users.onboardedAt));
  let scheduled = 0;
  for (const u of users) scheduled += await scheduleForUser(u.id, now);
  const result = await dispatchDue(now);

  // Retention: queue history 90 days, analytics events ~13 months.
  await db.delete(schema.notifications).where(lt(schema.notifications.createdAt, new Date(now.getTime() - 90 * 864e5)));
  await db.delete(schema.events).where(lt(schema.events.createdAt, new Date(now.getTime() - 400 * 864e5)));
  return { scheduled, ...result };
}
