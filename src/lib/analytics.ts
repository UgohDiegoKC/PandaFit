import "server-only";
import { db, schema } from "@/db";

/**
 * Product analytics (definitions in docs/ANALYTICS.md).
 * Rules: no names, emails, body measurements, free text or health details in props.
 * Tracking never throws — analytics must not break the product.
 */
export type EventName =
  | "signed_up" | "onboarding_completed" | "profile_updated" | "plan_generated" | "plan_edited"
  | "workout_started" | "workout_completed" | "pr_achieved"
  | "break_started" | "break_adjusted" | "break_ended_early"
  | "pro_booking_created" | "pro_booking_rescheduled" | "pro_booking_cancelled"
  | "notification_sent" | "push_enabled" | "theme_changed" | "data_exported" | "account_deleted";

type Props = Record<string, string | number | boolean>;

export async function track(name: EventName, userId: string | null, props?: Props) {
  try {
    await db.insert(schema.events).values({ name, userId, props: props ?? null });
  } catch (e) {
    console.warn("[analytics] dropped event", name, e instanceof Error ? e.message : e);
  }
}
