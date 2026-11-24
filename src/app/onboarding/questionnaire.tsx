"use client";

import { startTransition, useActionState, useState, type FormEvent } from "react";
import { ChevronLeft, Info } from "lucide-react";
import { FieldError } from "@/components/ui";
import { EXPERIENCE, GOAL_LABEL, GOALS, SESSION_LENGTHS, WEEKDAY_SHORT } from "@/lib/plan/types";
import { heightUnit, weightUnit, type UnitSystem } from "@/lib/units";
import { saveProfile, type OnboardingState } from "./actions";

export interface QuestionnaireDefaults {
  age?: number; sex?: string; weight?: number; height?: number; unitSystem?: UnitSystem; goal?: string;
  experience?: string; gymDays?: number[]; sessionMinutes?: number; limitations?: string | null;
}

const STEPS = ["About you", "Body", "Goal", "Schedule", "Safety"] as const;

const SEX_OPTS = [["male", "Male"], ["female", "Female"], ["other", "Other"], ["prefer_not", "Prefer not to say"]] as const;
const EXP_COPY: Record<(typeof EXPERIENCE)[number], string> = {
  beginner: "New to the gym or back after a long break",
  intermediate: "Training consistently for 6+ months",
  advanced: "Years of structured training",
};

function Why({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-3 flex gap-2 rounded-xl bg-surface-2 p-3 text-xs text-muted">
      <Info size={14} className="mt-0.5 shrink-0 text-accent-ink" aria-hidden /> <span>{children}</span>
    </p>
  );
}

function ChipGroup<T extends string | number>({ name, options, value, onChange, cols = 3, multiple }: {
  name: string; options: readonly (readonly [T, string])[]; value: T | T[]; onChange: (v: T) => void; cols?: number; multiple?: boolean;
}) {
  const selected = (v: T) => (Array.isArray(value) ? value.includes(v) : value === v);
  return (
    <div role={multiple ? "group" : "radiogroup"} className="grid gap-2" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
      {options.map(([v, label]) => (
        <button key={String(v)} type="button" role={multiple ? "checkbox" : "radio"} aria-checked={selected(v)} data-active={selected(v)} onClick={() => onChange(v)} className="chip">
          {label}
        </button>
      ))}
      {(Array.isArray(value) ? value : [value]).map((v) => (
        <input key={String(v)} type="hidden" name={name} value={String(v)} />
      ))}
    </div>
  );
}

export function Questionnaire({ defaults = {}, mode = "onboarding" }: { defaults?: QuestionnaireDefaults; mode?: "onboarding" | "profile" }) {
  const [state, action, pending] = useActionState<OnboardingState, FormData>(saveProfile, undefined);
  const [step, setStep] = useState(mode === "profile" ? -1 : 0); // -1 = show all steps at once
  const [unit, setUnit] = useState<UnitSystem>(defaults.unitSystem ?? "metric");
  const [sex, setSex] = useState(defaults.sex ?? "");
  const [goal, setGoal] = useState(defaults.goal ?? "");
  const [experience, setExperience] = useState(defaults.experience ?? "");
  const [days, setDays] = useState<number[]>(defaults.gymDays ?? [1, 3, 5]);
  const [minutes, setMinutes] = useState<number>(defaults.sessionMinutes ?? 45);
  const fe = state?.fieldErrors ?? {};

  const show = (i: number) => step === -1 || step === i;
  const toggleDay = (d: number) => setDays((cur) => (cur.includes(d) ? cur.filter((x) => x !== d) : [...cur, d].sort()));

  const stepValid = [
    !!sex, // age uses native validation
    true,
    !!goal && !!experience,
    days.length >= 1 && days.length <= 6,
    true,
  ];

  // Submit manually so React doesn't auto-reset uncontrolled fields when validation fails.
  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(() => action(fd));
  };

  return (
    <form onSubmit={onSubmit} className="space-y-8">
      {mode === "profile" && <input type="hidden" name="returnTo" value="profile" />}

      {mode === "onboarding" && (
        <div>
          <div className="flex items-center gap-3">
            {step > 0 && (
              <button type="button" onClick={() => setStep((s) => s - 1)} className="grid size-9 place-items-center rounded-full bg-surface-2" aria-label="Previous step">
                <ChevronLeft size={18} />
              </button>
            )}
            <span className="eyebrow">Step {step + 1} of {STEPS.length} · {STEPS[step]}</span>
          </div>
          <div className="mt-3 flex gap-1.5" aria-hidden>
            {STEPS.map((_, i) => <span key={i} className={`h-1 flex-1 rounded-full ${i <= step ? "bg-accent" : "bg-surface-3"}`} />)}
          </div>
        </div>
      )}

      <section hidden={!show(0)} className="space-y-5">
        <h2 className="text-2xl font-bold">About you</h2>
        <div>
          <label htmlFor="age" className="label">Age</label>
          <input id="age" name="age" type="number" inputMode="numeric" min={18} max={100} required defaultValue={defaults.age} className="input" />
          <FieldError>{fe.age}</FieldError>
        </div>
        <div>
          <span className="label">Sex</span>
          <ChipGroup name="sex" options={SEX_OPTS} value={sex} onChange={setSex} cols={2} />
          <FieldError>{fe.sex}</FieldError>
          <Why>Age and sex help us choose sensible starting volume and recovery. They&apos;re never shown publicly.</Why>
        </div>
      </section>

      <section hidden={!show(1)} className="space-y-5">
        <h2 className="text-2xl font-bold">Your body</h2>
        <div>
          <span className="label">Units</span>
          <ChipGroup name="unitSystem" options={[["metric", "kg · cm"], ["imperial", "lb · in"]] as const} value={unit} onChange={setUnit} cols={2} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="weight" className="label">Weight ({weightUnit(unit)})</label>
            <input id="weight" name="weight" type="number" inputMode="decimal" step="0.1" required defaultValue={defaults.weight} className="input" />
            <FieldError>{fe.weight}</FieldError>
          </div>
          <div>
            <label htmlFor="height" className="label">Height ({heightUnit(unit)})</label>
            <input id="height" name="height" type="number" inputMode="decimal" step="0.1" required defaultValue={defaults.height} className="input" />
            <FieldError>{fe.height}</FieldError>
          </div>
        </div>
        <Why>Used only to tailor your plan. You can edit or delete these details any time in Profile.</Why>
      </section>

      <section hidden={!show(2)} className="space-y-5">
        <h2 className="text-2xl font-bold">What&apos;s the goal?</h2>
        <ChipGroup name="goal" options={GOALS.map((g) => [g, GOAL_LABEL[g]] as const)} value={goal} onChange={setGoal} cols={2} />
        <FieldError>{fe.goal}</FieldError>
        <div>
          <span className="label">Experience</span>
          <div role="radiogroup" className="space-y-2">
            {EXPERIENCE.map((e) => (
              <button key={e} type="button" role="radio" aria-checked={experience === e} data-active={experience === e} onClick={() => setExperience(e)} className="chip flex w-full flex-col items-start px-4 text-left">
                <span className="font-semibold capitalize">{e}</span>
                <span className="text-xs opacity-80">{EXP_COPY[e]}</span>
              </button>
            ))}
          </div>
          <input type="hidden" name="experience" value={experience} />
          <FieldError>{fe.experience}</FieldError>
        </div>
      </section>

      <section hidden={!show(3)} className="space-y-5">
        <h2 className="text-2xl font-bold">Your schedule</h2>
        <div>
          <span className="label">Gym days</span>
          <ChipGroup name="gymDays" multiple options={WEEKDAY_SHORT.map((d, i) => [i, d] as const)} value={days} onChange={toggleDay} cols={7} />
          <p className="mt-2 text-xs text-muted">{days.length} day{days.length === 1 ? "" : "s"} a week{days.length > 6 ? " — pick 6 or fewer so you get a rest day" : ""}</p>
          <FieldError>{fe.gymDays}</FieldError>
        </div>
        <div>
          <span className="label">Workout time</span>
          <ChipGroup name="sessionMinutes" options={SESSION_LENGTHS.map((m) => [m, `${m} min`] as const)} value={minutes} onChange={setMinutes} />
        </div>
      </section>

      <section hidden={!show(4)} className="space-y-5">
        <h2 className="text-2xl font-bold">Anything we should know?</h2>
        <div>
          <label htmlFor="limitations" className="label">Injuries or conditions (optional)</label>
          <textarea id="limitations" name="limitations" rows={3} maxLength={500} defaultValue={defaults.limitations ?? ""} placeholder="e.g. old left-knee injury, lower-back stiffness" className="input" />
          <Why>If you share something here, your plan avoids loading that area and uses safer exercise choices. PandaFit isn&apos;t a substitute for a doctor or physio — please get clearance if you have a medical condition, are pregnant, or have been told to limit exercise.</Why>
        </div>
        <label className="flex items-start gap-3 text-sm">
          <input type="checkbox" name="healthConsent" defaultChecked={mode === "profile"} className="mt-0.5 size-4 accent-[var(--accent)]" />
          <span>I consent to PandaFit using these health and body details to generate and adjust my workout plan. I can withdraw by deleting my profile.</span>
        </label>
        <FieldError>{fe.healthConsent}</FieldError>
      </section>

      {Object.keys(fe).length > 0 && step !== -1 && <p className="text-sm text-danger">Some answers need another look — go back to check the highlighted steps.</p>}

      <div className="flex gap-3">
        {mode === "onboarding" && step < STEPS.length - 1 ? (
          <button key="next" type="button" className="btn-primary w-full" disabled={!stepValid[step]} onClick={(e) => {
            e.preventDefault();
            const section = (e.currentTarget.form?.querySelectorAll("section")[step]) as HTMLElement | undefined;
            const invalid = section?.querySelector<HTMLInputElement>("input:invalid");
            if (invalid) { invalid.reportValidity(); return; }
            setStep((s) => s + 1);
          }}>
            Continue
          </button>
        ) : (
          <button key="submit" type="submit" className="btn-primary w-full" disabled={pending}>
            {pending ? "Saving…" : mode === "profile" ? "Save changes" : "Build my plan"}
          </button>
        )}
      </div>
    </form>
  );
}
