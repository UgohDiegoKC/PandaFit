"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Sparkles } from "lucide-react";

const STAGES = [
  "Reading your goal and experience",
  "Matching exercises to your gym days",
  "Fitting each session to your time",
  "Running safety checks",
  "Saving your plan",
];

type Status = "running" | "done" | "error";

export function Generator({ regenerate }: { regenerate: boolean }) {
  const router = useRouter();
  const [stage, setStage] = useState(0);
  const [status, setStatus] = useState<Status>("running");
  const [fallback, setFallback] = useState(false);
  const started = useRef(false);

  const run = useCallback(async () => {
    setStatus("running");
    setStage(0);
    const timer = setInterval(() => setStage((s) => Math.min(s + 1, STAGES.length - 2)), 1800);
    try {
      const res = await fetch(`/api/plan/generate${regenerate ? "?trigger=regenerate" : ""}`, { method: "POST" });
      if (!res.ok) throw new Error(await res.text());
      const data = (await res.json()) as { source: "ai" | "fallback" };
      setFallback(data.source === "fallback");
      setStage(STAGES.length - 1);
      setStatus("done");
      setTimeout(() => router.replace(`/app/plan?new=1${data.source === "fallback" ? "&fallback=1" : ""}`), 900);
    } catch {
      setStatus("error");
    } finally {
      clearInterval(timer);
    }
  }, [router, regenerate]);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    run();
  }, [run]);

  return (
    <div aria-live="polite">
      <div className="grid size-14 place-items-center rounded-2xl bg-accent text-on-accent">
        <Sparkles aria-hidden />
      </div>
      <h1 className="mt-6 text-3xl font-bold">
        {status === "error" ? "We hit a snag" : status === "done" ? "Your plan is ready" : regenerate ? "Rebuilding your plan" : "Building your plan"}
      </h1>
      <p className="mt-2 text-sm text-muted">
        {status === "error"
          ? "We couldn't reach the plan builder. Your answers are saved — try again."
          : "Your coach is using your answers to design a week that fits your goal, schedule and experience."}
      </p>

      {status !== "error" && (
        <div className="mt-6 h-1.5 overflow-hidden rounded-full bg-surface-3">
          <div className={status === "done" ? "h-full w-full bg-accent" : "progress-indeterminate h-full w-1/3 rounded-full bg-accent"} />
        </div>
      )}

      <ol className="mt-8 space-y-3">
        {STAGES.map((label, i) => {
          const done = status === "done" || i < stage;
          const active = status === "running" && i === stage;
          return (
            <li key={label} className={`flex items-center gap-3 text-sm ${done || active ? "text-fg" : "text-muted"}`}>
              <span className={`grid size-6 place-items-center rounded-full ${done ? "bg-accent text-on-accent" : active ? "border-2 border-accent" : "bg-surface-2"}`}>
                {done && <Check size={14} aria-hidden />}
              </span>
              {label}
            </li>
          );
        })}
      </ol>

      {fallback && status === "done" && (
        <p className="mt-6 rounded-xl bg-surface-2 p-3 text-xs text-muted">The AI coach was busy, so we built your plan from our proven templates. You can regenerate it later.</p>
      )}
      {status === "error" && <button onClick={run} className="btn-primary mt-8 w-full">Try again</button>}
    </div>
  );
}
