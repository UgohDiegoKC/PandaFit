/**
 * PandaFit core data model (Notion: "Design core data model").
 * SQLite/libSQL dialect — runs on a local file in dev and Turso/libSQL in staging/prod.
 * Exercise catalog lives in code (src/lib/catalog.ts) and is referenced by slug.
 */
import { sql } from "drizzle-orm";
import { sqliteTable, text, integer, real, index, uniqueIndex } from "drizzle-orm/sqlite-core";

const id = () => text("id").primaryKey().$defaultFn(() => crypto.randomUUID());
const createdAt = () =>
  integer("created_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date());

export const users = sqliteTable("users", {
  id: id(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name").notNull(),
  themePreference: text("theme_preference", { enum: ["light", "dark", "system"] }).notNull().default("system"),
  unitSystem: text("unit_system", { enum: ["metric", "imperial"] }).notNull().default("metric"),
  avatarDataUrl: text("avatar_data_url"),
  isPro: integer("is_pro", { mode: "boolean" }).notNull().default(false),
  role: text("role", { enum: ["user", "coach", "admin"] }).notNull().default("user"),
  onboardedAt: integer("onboarded_at", { mode: "timestamp_ms" }),
  createdAt: createdAt(),
});

/** Sensitive profile inputs — kept separate from the account row so they can be exported/deleted on their own. */
export const profiles = sqliteTable("profiles", {
  userId: text("user_id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  age: integer("age").notNull(),
  sex: text("sex", { enum: ["male", "female", "other", "prefer_not"] }).notNull(),
  weightKg: real("weight_kg").notNull(),
  heightCm: real("height_cm").notNull(),
  goal: text("goal", { enum: ["build_muscle", "lose_fat", "get_stronger", "general_fitness", "endurance"] }).notNull(),
  experience: text("experience", { enum: ["beginner", "intermediate", "advanced"] }).notNull(),
  gymDays: text("gym_days", { mode: "json" }).$type<number[]>().notNull(), // 0=Sun..6=Sat
  sessionMinutes: integer("session_minutes").notNull(),
  limitations: text("limitations"), // free text: injuries / conditions the user chose to share
  healthConsentAt: integer("health_consent_at", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
});

export const plans = sqliteTable(
  "plans",
  {
    id: id(),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    summary: text("summary").notNull(),
    rationale: text("rationale").notNull(),
    source: text("source", { enum: ["ai", "fallback", "edited"] }).notNull(),
    model: text("model"),
    promptVersion: text("prompt_version"),
    status: text("status", { enum: ["active", "archived"] }).notNull().default("active"),
    safetyNotes: text("safety_notes", { mode: "json" }).$type<string[]>().notNull().default([]),
    createdAt: createdAt(),
  },
  (t) => [index("plans_user_idx").on(t.userId, t.status)],
);

export const planDays = sqliteTable("plan_days", {
  id: id(),
  planId: text("plan_id").notNull().references(() => plans.id, { onDelete: "cascade" }),
  position: integer("position").notNull(),
  weekday: integer("weekday").notNull(),
  title: text("title").notNull(),
  focus: text("focus").notNull(),
  estMinutes: integer("est_minutes").notNull(),
});

export const planExercises = sqliteTable("plan_exercises", {
  id: id(),
  dayId: text("day_id").notNull().references(() => planDays.id, { onDelete: "cascade" }),
  position: integer("position").notNull(),
  exerciseSlug: text("exercise_slug").notNull(),
  sets: integer("sets").notNull(),
  repsMin: integer("reps_min").notNull(),
  repsMax: integer("reps_max").notNull(),
  restSec: integer("rest_sec").notNull(),
  weightGuidance: text("weight_guidance").notNull(),
  notes: text("notes"),
});

export const workoutSessions = sqliteTable(
  "workout_sessions",
  {
    id: id(),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    planDayId: text("plan_day_id").references(() => planDays.id, { onDelete: "set null" }),
    title: text("title").notNull(),
    startedAt: integer("started_at", { mode: "timestamp_ms" }).notNull(),
    completedAt: integer("completed_at", { mode: "timestamp_ms" }),
    durationSec: integer("duration_sec"),
    notes: text("notes"),
  },
  (t) => [index("sessions_user_idx").on(t.userId, t.startedAt)],
);

export const setLogs = sqliteTable("set_logs", {
  id: id(),
  sessionId: text("session_id").notNull().references(() => workoutSessions.id, { onDelete: "cascade" }),
  exerciseSlug: text("exercise_slug").notNull(),
  setNumber: integer("set_number").notNull(),
  weightKg: real("weight_kg").notNull().default(0),
  reps: integer("reps").notNull(),
  completed: integer("completed", { mode: "boolean" }).notNull().default(true),
});

export const personalRecords = sqliteTable(
  "personal_records",
  {
    id: id(),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    exerciseSlug: text("exercise_slug").notNull(),
    kind: text("kind", { enum: ["max_weight", "est_1rm", "max_reps"] }).notNull(),
    value: real("value").notNull(),
    weightKg: real("weight_kg").notNull(),
    reps: integer("reps").notNull(),
    sessionId: text("session_id").references(() => workoutSessions.id, { onDelete: "set null" }),
    achievedAt: integer("achieved_at", { mode: "timestamp_ms" }).notNull(),
  },
  (t) => [uniqueIndex("pr_unique").on(t.userId, t.exerciseSlug, t.kind)],
);

export const breaks = sqliteTable("breaks", {
  id: id(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  startsOn: text("starts_on").notNull(), // YYYY-MM-DD
  endsOn: text("ends_on").notNull(),
  reason: text("reason"),
  endedEarlyOn: text("ended_early_on"),
  createdAt: createdAt(),
});

/** Per-user notification settings. Times are local to `timezone` (IANA name). */
export const notificationPrefs = sqliteTable("notification_prefs", {
  userId: text("user_id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  timezone: text("timezone").notNull().default("UTC"),
  emailEnabled: integer("email_enabled", { mode: "boolean" }).notNull().default(true),
  pushEnabled: integer("push_enabled", { mode: "boolean" }).notNull().default(true),
  gymReminders: integer("gym_reminders", { mode: "boolean" }).notNull().default(true),
  gymTimeMin: integer("gym_time_min").notNull().default(18 * 60), // usual workout start, minutes after local midnight
  gymLeadMin: integer("gym_lead_min").notNull().default(60), // remind this many minutes before
  breakReminders: integer("break_reminders", { mode: "boolean" }).notNull().default(true),
  checkinReminders: integer("checkin_reminders", { mode: "boolean" }).notNull().default(true),
  quietStartMin: integer("quiet_start_min").notNull().default(22 * 60),
  quietEndMin: integer("quiet_end_min").notNull().default(7 * 60),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
});

export const pushSubscriptions = sqliteTable("push_subscriptions", {
  endpoint: text("endpoint").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  createdAt: createdAt(),
});

/** Notification queue. dedupeKey makes scheduling idempotent; stale items are skipped at send time. */
export const notifications = sqliteTable(
  "notifications",
  {
    id: id(),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    kind: text("kind", { enum: ["gym_prep", "break_ending", "checkin_reminder", "booking_update"] }).notNull(),
    dedupeKey: text("dedupe_key").notNull().unique(),
    sendAt: integer("send_at", { mode: "timestamp_ms" }).notNull(),
    status: text("status", { enum: ["pending", "sent", "skipped", "failed"] }).notNull().default("pending"),
    attempts: integer("attempts").notNull().default(0),
    title: text("title").notNull(),
    body: text("body").notNull(),
    url: text("url").notNull().default("/app"),
    channels: text("channels", { mode: "json" }).$type<string[]>(),
    error: text("error"),
    sentAt: integer("sent_at", { mode: "timestamp_ms" }),
    createdAt: createdAt(),
  },
  (t) => [index("notifications_due_idx").on(t.status, t.sendAt)],
);

/** Every email the app sends (or would send, in console mode). Lets you inspect mail in dev at /admin. */
export const emailOutbox = sqliteTable("email_outbox", {
  id: id(),
  to: text("to").notNull(),
  subject: text("subject").notNull(),
  text: text("text").notNull(),
  provider: text("provider").notNull(),
  status: text("status", { enum: ["sent", "failed"] }).notNull(),
  error: text("error"),
  createdAt: createdAt(),
});

/** Product analytics. Event props must not contain names, emails, body data or free text. */
export const events = sqliteTable(
  "events",
  {
    id: id(),
    userId: text("user_id").references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    props: text("props", { mode: "json" }).$type<Record<string, string | number | boolean>>(),
    createdAt: createdAt(),
  },
  (t) => [index("events_name_idx").on(t.name, t.createdAt)],
);

/** Coach availability. One row per bookable slot (UTC). */
export const coachSlots = sqliteTable(
  "coach_slots",
  {
    id: id(),
    coachId: text("coach_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    startsAt: integer("starts_at", { mode: "timestamp_ms" }).notNull(),
    durationMin: integer("duration_min").notNull().default(30),
    blocked: integer("blocked", { mode: "boolean" }).notNull().default(false),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("coach_slot_unique").on(t.coachId, t.startsAt), index("coach_slot_time_idx").on(t.startsAt)],
);

export const proBookings = sqliteTable(
  "pro_bookings",
  {
    id: id(),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    coachId: text("coach_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    slotId: text("slot_id").notNull().references(() => coachSlots.id, { onDelete: "cascade" }),
    seriesId: text("series_id").notNull(),
    cadence: text("cadence", { enum: ["weekly", "biweekly"] }).notNull(),
    status: text("status", { enum: ["confirmed", "cancelled"] }).notNull().default("confirmed"),
    cancelledAt: integer("cancelled_at", { mode: "timestamp_ms" }),
    createdAt: createdAt(),
  },
  // A slot can only hold one confirmed booking — enforced by the database, not just app code.
  (t) => [uniqueIndex("booking_slot_confirmed").on(t.slotId).where(sql`status = 'confirmed'`), index("booking_user_idx").on(t.userId)],
);

export const passwordResetTokens = sqliteTable("password_reset_tokens", {
  tokenHash: text("token_hash").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
  usedAt: integer("used_at", { mode: "timestamp_ms" }),
});

/** AI generation audit log: latency, outcome, and failure reason — no raw profile data stored. */
export const aiGenerations = sqliteTable("ai_generations", {
  id: id(),
  userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
  model: text("model"),
  promptVersion: text("prompt_version").notNull(),
  outcome: text("outcome", { enum: ["success", "invalid_output", "timeout", "error", "no_api_key"] }).notNull(),
  latencyMs: integer("latency_ms").notNull(),
  inputTokens: integer("input_tokens"),
  outputTokens: integer("output_tokens"),
  error: text("error"),
  createdAt: createdAt(),
});

export type User = typeof users.$inferSelect;
export type Profile = typeof profiles.$inferSelect;
export type Plan = typeof plans.$inferSelect;
export type PlanDay = typeof planDays.$inferSelect;
export type PlanExercise = typeof planExercises.$inferSelect;
export type WorkoutSession = typeof workoutSessions.$inferSelect;
export type SetLog = typeof setLogs.$inferSelect;
