"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { endSession, requireUser, verifyPassword } from "@/lib/auth";
import { getPrefs } from "@/lib/notify/service";
import { hhmmToMin, isValidTimeZone } from "@/lib/tz";
import { track } from "@/lib/analytics";

export async function saveTheme(pref: "light" | "dark" | "system") {
  const user = await requireUser();
  if (!["light", "dark", "system"].includes(pref)) return;
  await db.update(schema.users).set({ themePreference: pref }).where(eq(schema.users.id, user.id));
  await track("theme_changed", user.id, { theme: pref });
}

const MAX_AVATAR_BYTES = 400_000;
const AVATAR_TYPES = ["image/jpeg", "image/png", "image/webp"];

export type AvatarState = { error?: string } | undefined;

/** Stores a client-resized avatar as a data URL. Swap for object storage (S3/GCS) before scale-up. */
export async function saveAvatar(_: AvatarState, form: FormData): Promise<AvatarState> {
  const user = await requireUser();
  const dataUrl = String(form.get("avatar") ?? "");
  const m = /^data:(image\/[a-z]+);base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl);
  if (!m || !AVATAR_TYPES.includes(m[1])) return { error: "Please choose a JPG, PNG or WebP image." };
  if (Buffer.byteLength(m[2], "base64") > MAX_AVATAR_BYTES) return { error: "That image is too large — try a smaller one." };
  await db.update(schema.users).set({ avatarDataUrl: dataUrl }).where(eq(schema.users.id, user.id));
  revalidatePath("/app", "layout");
}

export async function removeAvatar() {
  const user = await requireUser();
  await db.update(schema.users).set({ avatarDataUrl: null }).where(eq(schema.users.id, user.id));
  revalidatePath("/app", "layout");
}

export async function updateName(form: FormData) {
  const user = await requireUser();
  const name = String(form.get("name") ?? "").trim().slice(0, 60);
  if (name) await db.update(schema.users).set({ name }).where(eq(schema.users.id, user.id));
  revalidatePath("/app", "layout");
}

export type DeleteState = { error?: string } | undefined;

/** Permanently deletes the account and all related data (cascading foreign keys). */
export async function deleteAccount(_: DeleteState, form: FormData): Promise<DeleteState> {
  const user = await requireUser({ allowUnonboarded: true });
  if (form.get("confirm") !== "DELETE") return { error: 'Type DELETE to confirm.' };
  if (!(await verifyPassword(String(form.get("password") ?? ""), user.passwordHash))) return { error: "Password is incorrect." };
  await db.delete(schema.users).where(eq(schema.users.id, user.id));
  await track("account_deleted", null);
  await endSession();
  redirect("/?deleted=1");
}

// ── Notifications ────────────────────────────────────────────────


export type PrefsState = { error?: string; saved?: boolean } | undefined;

export async function saveNotificationPrefs(_: PrefsState, form: FormData): Promise<PrefsState> {
  const user = await requireUser();
  await getPrefs(user.id);
  const gymTime = hhmmToMin(String(form.get("gymTime") ?? ""));
  const quietStart = hhmmToMin(String(form.get("quietStart") ?? ""));
  const quietEnd = hhmmToMin(String(form.get("quietEnd") ?? ""));
  const lead = Number(form.get("gymLead"));
  if ([gymTime, quietStart, quietEnd].some((v) => !Number.isFinite(v) || v < 0 || v >= 1440)) return { error: "Please enter valid times." };
  if (![15, 30, 60, 90, 120, 180].includes(lead)) return { error: "Pick a reminder lead time from the list." };
  const on = (k: string) => form.get(k) === "on";
  await db.update(schema.notificationPrefs).set({
    emailEnabled: on("emailEnabled"), pushEnabled: on("pushEnabled"), gymReminders: on("gymReminders"),
    breakReminders: on("breakReminders"), checkinReminders: on("checkinReminders"),
    gymTimeMin: gymTime, gymLeadMin: lead, quietStartMin: quietStart, quietEndMin: quietEnd, updatedAt: new Date(),
  }).where(eq(schema.notificationPrefs.userId, user.id));
  // Pending reminders built from old settings will be dropped as stale at send time.
  return { saved: true };
}

/** Called by the browser with its IANA zone so reminders follow the user when they travel. */
export async function syncTimezone(tz: string) {
  const user = await requireUser();
  if (!isValidTimeZone(tz)) return;
  const prefs = await getPrefs(user.id);
  if (prefs.timezone !== tz) await db.update(schema.notificationPrefs).set({ timezone: tz, updatedAt: new Date() }).where(eq(schema.notificationPrefs.userId, user.id));
}

export async function sendTestNotification(): Promise<{ message: string }> {
  const user = await requireUser();
  const { enqueueNow, dispatchDue } = await import("@/lib/notify/service");
  await enqueueNow(user.id, { title: "Test from PandaFit", body: "Notifications are working 🎉", url: "/app/profile#notifications", dedupeKey: `test:${user.id}:${Date.now()}` });
  const r = await dispatchDue(new Date(), user.id);
  return { message: r.sent ? "Sent — check your browser notifications or inbox." : "Nothing was delivered. Check that at least one channel is on." };
}

