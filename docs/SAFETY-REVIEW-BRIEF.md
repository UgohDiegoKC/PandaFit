# PandaFit — safety review brief

**For:** a qualified reviewer (certified strength & conditioning coach, physiotherapist or sports-medicine clinician)
**Purpose:** confirm or change the rules PandaFit uses to keep AI-generated gym plans safe, before real users get them.
**Time needed:** about 60–90 minutes.

## How plans are made (one paragraph)

New users answer: age (18+ only), sex, height, weight, goal, experience level, gym days, session length, and an optional free-text box for injuries/conditions. An AI model drafts a weekly plan using **only** the 40 exercises in our catalog. The fixed rules below then correct or reject the draft. If the AI fails, a template plan is used and passes through the same rules. Users can edit any day; edits are checked by the same rules too. Users always see "general fitness guidance, not medical advice".

## The rules — please mark each ✅ agree, ✏️ change (say how), or ❌ remove

| # | Rule today | Your call |
| --- | --- | --- |
| 1 | Adults 18+ only | |
| 2 | Sets per exercise: 1–5 (beginners max 4) | |
| 3 | Reps: 1–30; timed exercises 15–90 seconds | |
| 4 | Rest: 30–240 s; at least 60 s for compound lifts | |
| 5 | Max 8 exercises per session, min 2 | |
| 6 | Session length must fit the user's chosen time (+15%, incl. 5-min warm-up) | |
| 7 | "High-risk" lifts (back squat, deadlift, barbell bench, barbell row, overhead press) are swapped for safer alternatives for: beginners, anyone 65+, anyone who mentions an injury/condition | |
| 8 | Beginners never get "advanced" exercises (currently: barbell deadlift) and never fewer than 6 reps | |
| 9 | Users 65+: never fewer than 8 reps | |
| 10 | Weight guidance is effort-based ("stop 2 reps short of failure"), never a kg target | |
| 11 | If an injury/condition is mentioned: show "check with a doctor or physiotherapist before starting, and stop any exercise that causes pain" | |
| 12 | Progression advice: add a rep or a small amount of weight once the top of the rep range is reached on every set | |
| 13 | Breaks: up to 6 weeks; streak pauses, doesn't reset | |

The "high-risk" and "advanced" labels on each exercise are in `src/lib/catalog.ts` — please also skim the catalog's instructions and coaching cues (about 20 minutes).

## Open questions we need you to decide

1. **Should some answers block plan generation entirely** and ask for medical clearance first? Today these only get the warning in rule 11: pregnancy, surgery in the last ~3 months, uncontrolled high blood pressure, heart conditions, chest pain or dizziness during exercise. *(Our recommendation: yes — block and show a clearance message for these.)*
2. The injury box is free text, so the app can't reliably tell *which* body part to protect. Should we replace it with a checklist (knee / lower back / shoulder / wrist / other) so specific exercises can be excluded?
3. Is 18+ right for launch, or should 16–17 be allowed with extra limits?
4. Are rules 2–4 too permissive for complete beginners in their first 2 weeks (e.g. cap at 3 sets and add a "learning" week)?
5. Food guidance shows general food sources only (no calories, macros or supplements) with a disclaimer. Is that wording appropriate?

## What to look at

- 30 test profiles, including older adults, injuries, pregnancy, asthma and a prompt-injection attempt, are in `scripts/eval-plans.ts`.
- Running `npm run eval:plans` with the AI enabled produces `reports/plan-eval-*.json`, containing **every plan generated**. Please review a sample of at least 10, prioritising the injury and older-adult cases.
- Exercise catalog: `src/lib/catalog.ts`. Rules code: `src/lib/plan/safety.ts`.

## Sign-off

Reviewer name & qualification: ____________________ Date: __________

☐ Rules approved as-is  ☐ Approved with the changes marked above  ☐ Not approved — changes required before launch
