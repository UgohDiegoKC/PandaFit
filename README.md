# PandaFit 🐼💛

AI-powered gym coach. **Phase 1 of the PandaFit App Development Board: the responsive web app + the shared backend API** that the iOS (Phase 2) and Android (Phase 3) apps will call.

Sign up → answer a short questionnaire → an AI coach builds a weekly plan (validated, safety-checked, with a template fallback) → log sets with rest timers → track PRs, streaks, breaks and history. Pro members book weekly or bi-weekly coach check-ins. Gym-day, break-ending and check-in reminders go out by browser push and email, respecting quiet hours. Yellow-on-black, dark-first, with a Light/Dark/System switch saved to the account.

## Quick start

```bash
npm install
cp .env.example .env.local        # set AUTH_SECRET; add ANTHROPIC_API_KEY to enable AI plans
npm run setup                     # creates the SQLite DB and a demo account
npm run dev                       # http://localhost:3000
```

Demo logins (password `pandafit123` for both):

- `demo@pandafit.app`: member with six weeks of history, **Pro** and **admin** (can open `/admin`)
- `coach@pandafit.app`: coach with four weeks of evening availability (can open `/coach`)

Everything works with no third-party keys:

| Without…             | What happens                                                                                                    |
| --------------------- | --------------------------------------------------------------------------------------------------------------- |
| `ANTHROPIC_API_KEY` | Plans come from the rule-based generator, labelled "Template plan"                                              |
| an email provider     | `EMAIL_PROVIDER=console` prints emails to the server log; admins can read them at `/admin` → Recent emails |
| `VAPID_*` keys      | Browser push is hidden; reminders fall back to email. Run `npm run vapid` to generate keys                    |

Reminders are sent by a job that runs every 5 minutes in production (a scheduled GitHub Action calls the app). Locally, run `npm run jobs:reminders` or press **Run reminder job now** at `/admin`.

| Script                                  | What it does                                                                                                                         |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `npm run dev` / `build` / `start` | Next.js dev server / production build / serve                                                                                        |
| `npm test`                            | Unit + integration tests: safety rules, fallback planner, streaks, PRs, timezones, reminder planner/job, booking rules (real SQLite) |
| `npm run test:e2e`                    | Playwright browser tests against a production build with its own database                                                            |
| `npm run eval:plans`                  | Runs 30 test profiles through the real AI and checks every plan; writes `reports/plan-eval-*.json`                                 |
| `npm run jobs:reminders`              | Run the reminder job once                                                                                                            |
| `npm run vapid`                       | Generate browser-push keys                                                                                                           |
| `npm run figures:sheet`               | Render every exercise illustration to `reports/figure-sheet.html` for review                                                       |
| `npm run lint` / `typecheck`        | ESLint / TypeScript                                                                                                                  |
| `npm run db:push`                     | Apply `src/db/schema.ts` to the database                                                                                           |
| `npm run db:seed`                     | (Re)create the demo account                                                                                                          |

> On Windows, run the commands in PowerShell or Git Bash from this folder. Node 20.9+ (22 recommended).

## Stack

- **Next.js 16** (App Router, server actions, route handlers) + **React 19** + **TypeScript**
- **Tailwind CSS 4** with design tokens in `src/app/globals.css`
- **Drizzle ORM + libSQL** — local SQLite file in dev, Turso in preview/production
- **Anthropic Claude** (server-side only) via forced tool-call structured output, validated with **zod**
- Auth: bcrypt password hashes + signed JWT (httpOnly cookie on web; `Authorization: Bearer` for mobile)
- Hosting on **Vercel** (Git integration), CI and the reminder schedule on **GitHub Actions**

## Project layout

```
src/
  app/
    (auth)/            sign-up, sign-in, forgot/reset password + server actions
    onboarding/        5-step questionnaire, plan-generation progress screen
    app/               signed-in app: home, plan, day editor, workout logger,
                       summary, exercise detail, progress & breaks, profile, nutrition
    api/               shared backend: plan/generate, sessions/[id], me/export, push/subscribe, cron/reminders, health
    coach/             coach availability manager (role: coach/admin)
    admin/             users, Pro switch, roles, funnel, notifications, email outbox (role: admin)
  components/          theme switch, nav, heatmap, UI primitives
  db/                  schema.ts (data model) + client
  lib/
    catalog.ts         standard-gym exercise catalog (the only exercises the AI may use)
    plan/              ai.ts · safety.ts · fallback.ts · service.ts · types.ts
    progress.ts        streaks, PR detection, activity grid (pure, tested)
    notify/            reminder planner (pure) · delivery job · web push
    coach.ts           availability + booking rules
    email.ts           console / Resend / SendGrid sender
    analytics.ts       event tracking · metrics.ts  dashboard queries
    tz.ts              timezone helpers
    figure/            exercise form illustrations: rig (2-link IK) + movement templates
tests/                 unit tests
.github/workflows/     ci.yml (lint/type/test/build/e2e) · reminders.yml (calls the reminder job every 5 min)
docs/                  ARCHITECTURE.md · ANALYTICS.md · SAFETY-REVIEW-BRIEF.md
e2e/                   Playwright browser tests
```

## Deploying

Vercel hosts the app; Turso hosts the database.

1. **Databases.** With the [Turso CLI](https://docs.turso.tech/cli): `turso db create pandafit` and `turso db create pandafit-preview`. For each, note the URL (`turso db show <name> --url`) and a token (`turso db tokens create <name>`).
2. **Schema.** Apply it to each database:
   `DATABASE_URL=libsql://… DATABASE_AUTH_TOKEN=… npm run db:push` (and again after schema changes; switch to `db:generate` migrations once you have real users).
3. **Vercel project.** Import the GitHub repo at vercel.com/new (framework: Next.js, defaults are fine). Under Settings → Environment Variables, add these for **Production**, using the `pandafit` database:
   `AUTH_SECRET`, `DATABASE_URL`, `DATABASE_AUTH_TOKEN`, `ANTHROPIC_API_KEY`, `AI_MODEL`, `CRON_SECRET`, `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`, `EMAIL_PROVIDER`, `EMAIL_FROM`, plus `RESEND_API_KEY` or `SENDGRID_API_KEY` once you pick a provider.
   Add the same set for **Preview**, but point `DATABASE_URL`/`DATABASE_AUTH_TOKEN` at `pandafit-preview` and use a different `AUTH_SECRET`.
   `APP_URL` (the base of links in emails) is optional on Vercel: production uses the project's production domain and each preview uses its own branch URL. Set it only once you add a custom domain.
4. **Reminders.** In GitHub → Settings → Secrets and variables → Actions, add the secret `CRON_SECRET` (same value as in Vercel Production) and the variable `APP_URL` (your production URL). `.github/workflows/reminders.yml` then calls the job every 5 minutes. On Vercel Pro you can use Vercel Cron instead; the endpoint also accepts GET.

After that, every push to `main` deploys to production, and every pull request gets its own preview URL using the preview database. Roll back from the Vercel dashboard (Deployments → Promote to Production on an earlier build).

See **docs/ARCHITECTURE.md** for how plan generation, safety and privacy work.
