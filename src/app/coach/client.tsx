"use client";

import { useActionState, useState, useTransition } from "react";
import { Ban, Trash2, Unlock } from "lucide-react";
import { FieldError } from "@/components/ui";
import { addSlots, removeSlot, toggleBlock, type SlotState } from "./actions";

export function AddSlotsForm({ minDate }: { minDate: string }) {
  const [state, action, pending] = useActionState<SlotState, FormData>(addSlots, undefined);
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-5 sm:items-end">
      <label><span className="label">Date</span><input type="date" name="date" min={minDate} required className="input" /></label>
      <label><span className="label">Start</span><input type="time" name="time" required step={900} className="input" /></label>
      <label><span className="label">Length</span><select name="duration" defaultValue={30} className="input">{[15, 30, 45, 60].map((m) => <option key={m} value={m}>{m} min</option>)}</select></label>
      <label><span className="label">Repeat weekly</span><select name="repeat" defaultValue={0} className="input">{[0, 1, 3, 7, 11].map((w) => <option key={w} value={w}>{w === 0 ? "No" : `+${w} weeks`}</option>)}</select></label>
      <button className="btn-primary" disabled={pending}>{pending ? "Adding…" : "Add"}</button>
      <div className="sm:col-span-5">{state?.message && <p className="text-sm text-success">{state.message}</p>}<FieldError>{state?.error}</FieldError></div>
    </form>
  );
}

export function SlotActions({ id, blocked, booked }: { id: string; blocked: boolean; booked: boolean }) {
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<{ error?: string }>) => start(async () => setError((await fn()).error));
  return (
    <div className="flex items-center gap-1">
      {!booked && (
        <button className="btn-ghost p-2" disabled={pending} aria-label={blocked ? "Unblock slot" : "Block slot"} onClick={() => run(() => toggleBlock(id, !blocked))}>
          {blocked ? <Unlock size={16} /> : <Ban size={16} />}
        </button>
      )}
      {!booked && <button className="btn-ghost p-2 hover:text-danger" disabled={pending} aria-label="Delete slot" onClick={() => run(() => removeSlot(id))}><Trash2 size={16} /></button>}
      {error && <span role="alert" className="text-xs text-danger">{error}</span>}
    </div>
  );
}
