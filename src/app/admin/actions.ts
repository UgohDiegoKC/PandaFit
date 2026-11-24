"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireRole } from "@/lib/auth";
import { runReminderJob } from "@/lib/notify/service";

export async function setPro(userId: string, isPro: boolean) {
  await requireRole("admin");
  await db.update(schema.users).set({ isPro }).where(eq(schema.users.id, userId));
  revalidatePath("/admin");
}

export async function setRole(userId: string, role: "user" | "coach" | "admin") {
  const admin = await requireRole("admin");
  if (userId === admin.id && role !== "admin") return { error: "You can't remove your own admin role." };
  await db.update(schema.users).set({ role }).where(eq(schema.users.id, userId));
  revalidatePath("/admin");
  return {};
}

export async function runRemindersNow() {
  await requireRole("admin");
  const s = await runReminderJob();
  revalidatePath("/admin");
  return `Scheduled ${s.scheduled}, sent ${s.sent}, deferred ${s.deferred}, skipped ${s.skipped}, retried ${s.retried}, failed ${s.failed}.`;
}
