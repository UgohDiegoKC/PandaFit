import { NextResponse } from "next/server";
import { eq, inArray } from "drizzle-orm";
import { db, schema } from "@/db";
import { track } from "@/lib/analytics";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";

/** GET /api/me/export — data-portability export of everything stored for the signed-in user. */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { passwordHash: _omit, ...account } = user;
  const [prefs, bookings, notifications, events, pushDevices] = await Promise.all([
    db.select().from(schema.notificationPrefs).where(eq(schema.notificationPrefs.userId, user.id)),
    db.select().from(schema.proBookings).where(eq(schema.proBookings.userId, user.id)),
    db.select().from(schema.notifications).where(eq(schema.notifications.userId, user.id)),
    db.select().from(schema.events).where(eq(schema.events.userId, user.id)),
    db.select({ createdAt: schema.pushSubscriptions.createdAt }).from(schema.pushSubscriptions).where(eq(schema.pushSubscriptions.userId, user.id)),
  ]);
  const [profile, plans, sessions, records, breaks] = await Promise.all([
    db.query.profiles.findFirst({ where: eq(schema.profiles.userId, user.id) }),
    db.select().from(schema.plans).where(eq(schema.plans.userId, user.id)),
    db.select().from(schema.workoutSessions).where(eq(schema.workoutSessions.userId, user.id)),
    db.select().from(schema.personalRecords).where(eq(schema.personalRecords.userId, user.id)),
    db.select().from(schema.breaks).where(eq(schema.breaks.userId, user.id)),
  ]);
  const days = plans.length ? await db.select().from(schema.planDays).where(inArray(schema.planDays.planId, plans.map((p) => p.id))) : [];
  const exercises = days.length ? await db.select().from(schema.planExercises).where(inArray(schema.planExercises.dayId, days.map((d) => d.id))) : [];
  const sets = sessions.length ? await db.select().from(schema.setLogs).where(inArray(schema.setLogs.sessionId, sessions.map((s) => s.id))) : [];

  await track("data_exported", user.id);
  const body = JSON.stringify({ exportedAt: new Date().toISOString(), account, profile, plans, planDays: days, planExercises: exercises, sessions, sets, personalRecords: records, breaks, notificationPrefs: prefs[0] ?? null, proBookings: bookings, notifications, analyticsEvents: events, pushDevices: pushDevices.length }, null, 2);
  return new NextResponse(body, {
    headers: { "content-type": "application/json", "content-disposition": `attachment; filename="pandafit-export-${new Date().toISOString().slice(0, 10)}.json"` },
  });
}
