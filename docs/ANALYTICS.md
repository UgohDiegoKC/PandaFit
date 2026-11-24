# Analytics — event definitions

Events are written server-side to the `events` table by `track()` in `src/lib/analytics.ts`. They're shown at **/admin** and kept for ~13 months, after which the reminder job deletes them.

**Privacy rules:** events carry a user ID for funnels, plus small categorical props. They never contain names, emails, body measurements, free text or health details. Deleting an account deletes that user's events. Users get their own events in the data export.

| Event | When it fires | Props |
| --- | --- | --- |
| `signed_up` | Account created | — |
| `onboarding_completed` | First questionnaire submitted | goal, experience, days, minutes, limitations (bool only) |
| `profile_updated` | Questionnaire re-submitted from Profile | same as above |
| `plan_generated` | A plan is saved by the generator | source (`ai`/`fallback`), trigger (`signup`/`regenerate`), fallbackReason |
| `plan_edited` | User saves edits to a day | exercises |
| `workout_started` | "Start workout" pressed | resumed (bool) |
| `workout_completed` | Session finished (once per session) | sets, minutes, prs |
| `pr_achieved` | Each new personal record | kind |
| `break_started` / `break_adjusted` / `break_ended_early` | Break controls | days (start only) |
| `pro_booking_created` | Check-in series booked | cadence, booked, unavailable |
| `pro_booking_rescheduled` / `pro_booking_cancelled` | Booking changes | scope, count (cancel) |
| `notification_sent` | Each delivered reminder, per channel | kind, channel |
| `push_enabled` | Browser push turned on for a device | — |
| `theme_changed` | Theme switched (signed in) | theme |
| `data_exported` | Data export downloaded | — |
| `account_deleted` | Account deleted (no user ID stored) | — |

## Dashboard metrics (/admin)

- **Activation funnel:** of accounts created in the last 30 days, how many finished onboarding, have a plan, completed a workout, and completed a workout **within 7 days of signing up** (the activation definition).
- **Workout completion:** sessions completed ÷ sessions started (last 30 days).
- **Weekly active:** distinct users who completed a workout in the last 7 days.
- **AI generation:** outcome counts and average latency, from `ai_generations`. A rising `fallback` share means the model is failing validation or timing out.
- **Notifications (7d):** sent / skipped / failed. A high skipped count is normal: stale reminders and quiet hours are skipped by design.

These come straight from the app database. If you later add a dedicated analytics tool, forward these same events. Don't add client-side trackers that collect more.
