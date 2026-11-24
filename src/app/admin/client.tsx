"use client";

import { useState, useTransition } from "react";
import { runRemindersNow, setPro, setRole } from "./actions";

export function ProToggle({ userId, isPro, label }: { userId: string; isPro: boolean; label: string }) {
  const [pending, start] = useTransition();
  return (
    <label className="inline-flex cursor-pointer items-center gap-2 text-sm">
      <input type="checkbox" defaultChecked={isPro} disabled={pending} aria-label={`Pro for ${label}`} onChange={(e) => start(() => setPro(userId, e.target.checked))} className="size-4 accent-[var(--accent)]" />
      Pro
    </label>
  );
}

export function RoleSelect({ userId, role, label }: { userId: string; role: string; label: string }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string>();
  return (
    <span>
      <select aria-label={`Role for ${label}`} defaultValue={role} disabled={pending} className="rounded-lg border border-line bg-surface-2 px-2 py-1 text-sm"
        onChange={(e) => start(async () => setError((await setRole(userId, e.target.value as "user" | "coach" | "admin"))?.error))}>
        <option value="user">Member</option><option value="coach">Coach</option><option value="admin">Admin</option>
      </select>
      {error && <span role="alert" className="ml-2 text-xs text-danger">{error}</span>}
    </span>
  );
}

export function RunReminders() {
  const [msg, setMsg] = useState<string>();
  const [pending, start] = useTransition();
  return (
    <div className="flex flex-wrap items-center gap-3">
      <button className="btn-secondary py-2" disabled={pending} onClick={() => start(async () => setMsg(await runRemindersNow()))}>{pending ? "Running…" : "Run reminder job now"}</button>
      {msg && <span className="text-sm text-muted" role="status">{msg}</span>}
    </div>
  );
}
