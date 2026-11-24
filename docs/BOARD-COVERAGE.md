# Notion board coverage — "PandaFit — App Development Board"

Snapshot of what this codebase implements against the board on 24 Nov 2026. Statuses on the board were **not** changed.

## Phase 0 — Foundations (engineering items)

| Task | In code |
| --- | --- |
| Choose platforms and technical architecture | ✅ Web-first Next.js + shared API, server-side AI, Bearer-ready auth — `docs/ARCHITECTURE.md` |
| Design core data model | ✅ `src/db/schema.ts` (accounts, profiles, plans/days/exercises, sessions, sets, PRs, breaks, reminders, coach slots, bookings, reset tokens, AI audit) |
| Define AI workout-generation architecture and safety guardrails | ✅ `src/lib/plan/*` |
| Set up GitHub Actions CI/CD and ArgoCD deployment pipeline | ✅ `.github/workflows/*`, `deploy/` (incl. reminder CronJob). Needs your repo, cluster and secrets. Crash/error monitoring (e.g. Sentry) **not** wired |
| Create visual system, accessibility, and dark-theme standards | ✅ Tokens, primitives, focus rings, reduced-motion, Light/Dark/System |
| Product discovery, MVP scope/metrics, safety review, privacy/legal review, PRD, journeys | ❌ Not code — still need people. Safety rules and copy here are a starting point for a qualified reviewer, not a substitute |

## Phase 1 — Web app

| Task | Status |
| --- | --- |
| Implement account sign-up, sign-in, and recovery | ✅ reset links emailed (console until a provider key is set) |
| Design sign-up flow for AI-generated workout plans | ✅ 5-step questionnaire, “why we ask”, progress / success / retry / fallback states |
| Build onboarding questionnaire and profile capture | ✅ metric/imperial, edit later in Profile |
| Implement AI-generated personalized workout plans at sign-up | ✅ review, edit, regenerate, fallback |
| Test AI-generated workout plans for quality and safety | 🟡 `npm run eval:plans` checks 30 profiles against the real model. **Needs:** your API key to run it, plus reviewer sign-off (`docs/SAFETY-REVIEW-BRIEF.md`) |
| Implement a user-selectable dark theme and saved preference | ✅ |
| Create standard-gym exercise catalog | ✅ 40 exercises with muscles, equipment, instructions, cues, substitutions, tags |
| Build workout plan and prescription screens | ✅ |
| Prototype workout dashboard and session logging | ✅ Built directly (not a prototype) |
| Build workout session and set logging | ✅ edit sets, add sets, rest timer, offline draft, resume |
| Build exercise detail and video player | ✅ **Changed by decision (24 Nov): no videos.** Original form illustrations instead: a thumbnail beside every exercise, plus a looping start→finish demo on the detail page (pausable, respects reduced motion) and written steps |
| Show workout history and progress summaries | ✅ history, weekly volume, heatmap |
| Detect and celebrate personal workout records | ✅ |
| Implement weekly streaks and user-controlled breaks | ✅ start / adjust / end early |
| Build profile editing and image upload | ✅ |
| Design profile, progress, streak, and break screens | ✅ |
| Add goal-aware food-source guidance | ✅ general food sources only — no calorie/macro targets |
| Add automated unit, integration, and end-to-end test coverage | ✅ 145 unit/integration tests + 9 Playwright browser tests, all in CI |
| Instrument activation and workout-adherence analytics | ✅ `docs/ANALYTICS.md`, dashboard at /admin |
| Build gym-preparation reminders | ✅ |
| Build break-expiry resumption reminders | ✅ stale-safe when breaks change |
| Implement notification preferences and delivery handling | ✅ push + email, quiet hours, timezone, opt-outs, retries, dead-device cleanup |
| Build Pro coach availability calendar | ✅ /coach |
| Enable Pro weekly and bi-weekly check-in bookings | ✅ confirmations, reminders, reschedule, cancel. Video-call links not included yet; add a meeting URL per slot when you pick a tool |
| Design Pro check-in scheduling experience | ✅ |
| Create exercise and plan content-management workflow | ❌ catalog is in code — edits need a deploy |
| Source and review exercise demonstration videos | ⛔ Dropped. Replaced by illustrations; the board card can be cancelled |
| Run privacy, security, accessibility, and device QA | ❌ |

## Phases 2–4

Not started. The API is designed so iOS/Android can reuse it; see "One backend, three clients" in `ARCHITECTURE.md`.

## Still open: needs you, not code

| Gap | What's needed |
| --- | --- |
| AI path untested against the live model | Add `ANTHROPIC_API_KEY` to `.env.local`, run `npm run eval:plans` |
| Safety limits unreviewed | Send `docs/SAFETY-REVIEW-BRIEF.md` to a coach or physio. Our recommendation: block generation for pregnancy, recent surgery and heart conditions |
| Real email delivery | Create a Resend or SendGrid account, verify your domain, set `EMAIL_PROVIDER` and the key |
| Browser push in production | `npm run vapid`, then put the keys in the secret store |
| Pro payments | Pro is an admin switch until you add Paystack/Stripe |
