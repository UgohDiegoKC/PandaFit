import { beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { dispatchDue, runReminderJob, scheduleForUser } from "@/lib/notify/service";
import { makeUser, resetDb } from "./helpers";

describe("reminder job (integration)", () => {
  let userId: string;
  beforeEach(async () => {
    await resetDb();
    userId = await makeUser({ gymDays: [1, 3, 5] });
  });

  const queue = () => db.select().from(schema.notifications).where(eq(schema.notifications.userId, userId));

  it("schedules idempotently", async () => {
    const now = new Date("2026-11-23T08:00:00Z");
    await scheduleForUser(userId, now);
    await scheduleForUser(userId, now);
    expect((await queue()).filter((n) => n.kind === "gym_prep")).toHaveLength(1);
  });

  it("sends due reminders by email when push isn't set up, and records them", async () => {
    await scheduleForUser(userId, new Date("2026-11-23T08:00:00Z"));
    const s = await dispatchDue(new Date("2026-11-23T16:01:00Z"));
    expect(s.sent).toBe(1);
    const sent = (await queue()).find((n) => n.status === "sent")!;
    expect(sent.channels).toEqual(["email"]);
    expect((await db.select().from(schema.emailOutbox)).length).toBe(1);
  });

  it("skips reminders that became stale (break started after scheduling)", async () => {
    await scheduleForUser(userId, new Date("2026-11-23T08:00:00Z"));
    await db.insert(schema.breaks).values({ userId, startsOn: "2026-11-23", endsOn: "2026-11-30" });
    const s = await dispatchDue(new Date("2026-11-23T16:01:00Z"));
    expect(s.skipped).toBe(1);
    expect((await queue()).find((n) => n.dedupeKey.endsWith("2026-11-23"))?.error).toMatch(/stale/);
  });

  it("defers during quiet hours, then drops if it would arrive too late", async () => {
    await db.update(schema.notificationPrefs).set({ quietStartMin: 16 * 60, quietEndMin: 20 * 60 }).where(eq(schema.notificationPrefs.userId, userId));
    await scheduleForUser(userId, new Date("2026-11-23T08:00:00Z"));
    const s = await dispatchDue(new Date("2026-11-23T16:01:00Z")); // 17:01 Lagos, quiet until 20:00 but gym at 18:00
    expect(s.skipped).toBe(1);
  });

  it("skips everything when the user turned all channels off", async () => {
    await db.update(schema.notificationPrefs).set({ emailEnabled: false, pushEnabled: false }).where(eq(schema.notificationPrefs.userId, userId));
    await scheduleForUser(userId, new Date("2026-11-23T08:00:00Z"));
    expect((await dispatchDue(new Date("2026-11-23T16:01:00Z"))).skipped).toBe(1);
  });

  it("runs end-to-end without errors", async () => {
    const s = await runReminderJob(new Date("2026-11-23T16:01:00Z"));
    expect(s.scheduled).toBeGreaterThan(0);
  });
});
