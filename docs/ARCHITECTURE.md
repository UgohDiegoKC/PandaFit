# PandaFit architecture

## One backend, three clients

```
 Web (Phase 1, this repo)      iOS (Phase 2)        Android (Phase 3)
        │ cookie                    │ Bearer JWT          │ Bearer JWT
        └──────────────┬────────────┴─────────────────────┘
                       ▼
            Next.js server (route handlers + server actions)
              ├─ auth            src/lib/auth.ts
              ├─ plan pipeline   src/lib/plan/*
              ├─ progress logic  src/lib/progress.ts
              └─ data            Drizzle → libSQL (SQLite / Turso)
                       │
                       ▼
              Anthropic API (server-side only; key never ships to clients)
```

The web UI uses server actions for convenience. Everything the mobile apps need for the core loop is already exposed as JSON routes (`/api/plan/generate`, `/api/sessions/:id`, `/api/me/export`); before Phase 2, add `POST /api/auth/sign-in` returning a token and read-only GET routes for plan/progress — `getUserId()` already accepts `Authorization: Bearer`.

## Sign-up-triggered plan generation

```
questionnaire ─► saveProfile (zod + plausibility bounds, consent timestamp)
             ─► /onboarding/generating ─► POST /api/plan/generate
                   │
                   ├─ generateAiPlan()      forced tool call, catalog-only slugs, 25s timeout, 1 retry
                   ├─ planDraftSchema       zod validation of the tool input
                   ├─ applySafety()         deterministic rules (below)
                   │      └─ any failure ──► generateFallbackPlan() ─► applySafety()
                   ├─ ai_generations row    outcome, latency, tokens, error — no profile data
                   └─ savePlan()            archives previous plan, stores days/exercises
```

**What the model sees:** age, sex, height, weight, goal, experience, gym weekdays, session length, and the limitations text the user chose to share. Never name, email or IDs. Prompt version is stored on each plan (`plan-v1.x`) so model/prompt changes can be compared.

**Safety rules (`src/lib/plan/safety.ts`)** — the model proposes, these decide:

- Only catalog exercises; invented ones are dropped. A day with < 2 valid exercises fails → fallback.
- Days are re-mapped onto the user's chosen weekdays.
- Sets 1–5 (beginners ≤ 4), reps 1–30 (timed 15–90 s), rest 30–240 s (compound ≥ 60 s).
- High-risk barbell lifts are swapped for safer substitutions for beginners, users 65+, or anyone who reported a limitation; advanced lifts are swapped for beginners.
- 65+: rep floor of 8 to avoid very heavy loading.
- Each day is trimmed (isolation first, then sets) to fit the session length + 15%.
- Notes: professional-clearance message when limitations are reported; "not medical advice" always.

User edits to a day go through the same `applySafety()` before saving.

## Progress logic (`src/lib/progress.ts`)

- **Weekly streak:** consecutive Monday-start weeks with ≥ 1 completed workout. The current week can't break it; a week ≥ 4/7 covered by a break is frozen (pauses, doesn't reset).
- **PRs:** heaviest weight, Epley est. 1RM (≤ 12 reps only), max reps for bodyweight. Incomplete and implausible sets ignored; one record per exercise/kind per session; first-ever log sets a silent baseline; PRs computed once per session so re-saves don't re-celebrate.
- Workout drafts autosave to `localStorage` so a dropped connection or refresh doesn't lose sets; the server save is idempotent (replaces that session's sets).

## Reminders & notifications (`src/lib/notify/`)

```
every 5 min ─► POST /api/cron/reminders (Bearer CRON_SECRET)
                 1. plan:     desiredReminders(now, prefs, state) for each user → insert by dedupeKey (idempotent)
                 2. dispatch: for each due item → re-run the planner
                              · no longer desired?        → skipped (stale)
                              · in quiet hours?           → deferred to quiet end, or skipped if that's too late to be useful
                              · deliver: push to each device; email if push didn't land (always email for bookings)
                              · failures retry 3× with backoff; dead push endpoints (404/410) are removed
                 3. housekeeping: queue rows > 90 days, events > ~13 months
```

- **Gym-day:** on plan weekdays, *lead* minutes before the user's usual workout time. Not sent on break days.
- **Break ending:** 09:00 local, 2 days before the break's end date. Keyed to the end date, so moving or ending the break makes old reminders stale.
- **Check-in:** 24 h before each confirmed booking. Booking confirmations, reschedules and cancellations go to both member and coach immediately.
- **Timezones:** stored per user (IANA), synced from the device on each app load; all scheduling uses `src/lib/tz.ts` and is DST-safe.
- **Scale note:** the job loops over all onboarded users. That's fine into the low tens of thousands. After that, plan only for users whose state changed, or shard by user ID.

## Email (`src/lib/email.ts`)

`EMAIL_PROVIDER=console` (default) | `resend` | `sendgrid`. Every send, including console mode, is written to `email_outbox`, which admins can read at /admin. Password-reset links are emailed. In development with console mode, the link is also shown on screen.

## Pro coach booking (`src/lib/coach.ts`)

- Roles: `user` / `coach` / `admin`. **Pro is an admin switch** at /admin for now. Payments can be added later by setting `is_pro` from a payment webhook.
- Coaches add slots (15–60 min, optionally repeating weekly up to 12 weeks). Overlapping slots are refused. Booked slots can't be blocked or deleted.
- Members pick a slot and a cadence (weekly / every 2 weeks). The next 4 occurrences at the same time are booked where free, and missing dates are reported. One active series per member.
- Double-booking is prevented **by the database**: a partial unique index allows only one confirmed booking per slot. Bookings need 2 h notice.

## Privacy & data

- Sensitive profile inputs live in `profiles`, separate from `users`, with a `health_consent_at` timestamp.
- `GET /api/me/export` returns everything stored for the user. Account deletion (password + typed confirmation) cascades through every table.
- Avatars are resized to 256 px on-device (drops most EXIF/location) and capped at 400 KB. Move to object storage before scale.
- Password reset: hashed single-use tokens, 1-hour expiry, no account enumeration. **No email provider yet** — in dev the link is shown on screen and logged; in production it's only logged. Wire a provider before launch.
- MVP is 18+ only (validated at onboarding) pending the age-requirements review.

## Theme

Tokens are CSS variables on `<html data-theme>`. An inline script applies the saved choice before first paint (no flash). The choice is stored in `localStorage` immediately and on the user row (`theme_preference`) so it follows them across devices; `ThemeSync` seeds a new browser from the account. Yellow used as text switches to a darker `--accent-ink` in light mode for contrast.
