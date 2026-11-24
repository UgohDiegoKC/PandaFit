"use client";

import { useActionState } from "react";
import { FieldError } from "@/components/ui";
import { startBreak, type BreakState } from "./actions";

export function BreakForm({ min }: { min: string }) {
  const [state, action, pending] = useActionState<BreakState, FormData>(startBreak, undefined);
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
      <label><span className="label">Back on</span><input type="date" name="endsOn" min={min} required className="input" /></label>
      <label><span className="label">Reason (optional)</span><input name="reason" maxLength={120} placeholder="Holiday, illness…" className="input" /></label>
      <button className="btn-secondary" disabled={pending}>Take a break</button>
      <div className="sm:col-span-3"><FieldError>{state?.error}</FieldError></div>
    </form>
  );
}
