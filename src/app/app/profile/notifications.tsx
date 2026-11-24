"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { Bell, BellOff } from "lucide-react";
import { FieldError } from "@/components/ui";
import { minToHHMM } from "@/lib/tz";
import { saveNotificationPrefs, sendTestNotification, type PrefsState } from "./actions";

export interface PrefsView {
  timezone: string; emailEnabled: boolean; pushEnabled: boolean; gymReminders: boolean; gymTimeMin: number; gymLeadMin: number;
  breakReminders: boolean; checkinReminders: boolean; quietStartMin: number; quietEndMin: number;
}

function urlB64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

type PushState = "unsupported" | "unconfigured" | "denied" | "off" | "on" | "working";

function PushToggle({ vapidKey }: { vapidKey: string | null }) {
  const [state, setState] = useState<PushState>("working");
  const [error, setError] = useState<string>();

  useEffect(() => {
    (async () => {
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) return setState("unsupported");
      if (!vapidKey) return setState("unconfigured");
      if (Notification.permission === "denied") return setState("denied");
      const reg = await navigator.serviceWorker.getRegistration("/sw.js");
      setState((await reg?.pushManager.getSubscription()) ? "on" : "off");
    })().catch(() => setState("off"));
  }, [vapidKey]);

  const enable = async () => {
    setError(undefined);
    setState("working");
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") return setState(perm === "denied" ? "denied" : "off");
      const reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlB64ToUint8Array(vapidKey!) });
      const res = await fetch("/api/push/subscribe", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(sub.toJSON()) });
      if (!res.ok) throw new Error();
      setState("on");
    } catch {
      setError("Couldn't turn on browser notifications on this device.");
      setState("off");
    }
  };

  const disable = async () => {
    setState("working");
    const reg = await navigator.serviceWorker.getRegistration("/sw.js");
    const sub = await reg?.pushManager.getSubscription();
    if (sub) {
      await fetch("/api/push/subscribe", { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ endpoint: sub.endpoint }) });
      await sub.unsubscribe();
    }
    setState("off");
  };

  const copy: Record<PushState, string> = {
    unsupported: "This browser doesn't support push notifications — we'll use email.",
    unconfigured: "Browser push isn't set up on this server yet (missing VAPID keys) — we'll use email.",
    denied: "Notifications are blocked for this site. Allow them in your browser's site settings, then reload.",
    off: "Get reminders on this device.",
    on: "This device will get reminders.",
    working: "…",
  };

  return (
    <div className="flex items-center gap-3 rounded-xl bg-surface-2 p-3">
      {state === "on" ? <Bell size={18} className="text-accent-ink" aria-hidden /> : <BellOff size={18} className="text-muted" aria-hidden />}
      <p className="flex-1 text-sm">{copy[state]}<FieldError>{error}</FieldError></p>
      {state === "off" && <button type="button" onClick={enable} className="btn-primary py-2">Enable</button>}
      {state === "on" && <button type="button" onClick={disable} className="btn-secondary py-2">Turn off</button>}
    </div>
  );
}

function Toggle({ name, label, hint, defaultChecked }: { name: string; label: string; hint?: string; defaultChecked: boolean }) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4 py-3">
      <span><span className="block text-sm font-medium">{label}</span>{hint && <span className="block text-xs text-muted">{hint}</span>}</span>
      <input type="checkbox" name={name} defaultChecked={defaultChecked} role="switch" className="peer sr-only" />
      <span aria-hidden className="relative mt-0.5 h-6 w-11 shrink-0 rounded-full bg-surface-3 transition after:absolute after:left-0.5 after:top-0.5 after:size-5 after:rounded-full after:bg-white after:transition peer-checked:bg-accent peer-checked:after:translate-x-5 peer-focus-visible:outline-2 peer-focus-visible:outline-accent" />
    </label>
  );
}

export function NotificationSettings({ prefs, vapidKey }: { prefs: PrefsView; vapidKey: string | null }) {
  const [state, action, pending] = useActionState<PrefsState, FormData>(saveNotificationPrefs, undefined);
  const [testMsg, setTestMsg] = useState<string>();
  const [testing, startTest] = useTransition();

  return (
    <div className="space-y-4">
      <PushToggle vapidKey={vapidKey} />
      <form action={action} className="space-y-2">
        <div className="divide-y divide-line">
          <Toggle name="pushEnabled" label="Browser notifications" defaultChecked={prefs.pushEnabled} />
          <Toggle name="emailEnabled" label="Email" hint="Backup when push isn't available; always used for check-in bookings" defaultChecked={prefs.emailEnabled} />
          <Toggle name="gymReminders" label="Gym-day reminders" defaultChecked={prefs.gymReminders} />
          <Toggle name="breakReminders" label="Break ending (2 days before)" defaultChecked={prefs.breakReminders} />
          <Toggle name="checkinReminders" label="Coach check-in (24 hours before)" defaultChecked={prefs.checkinReminders} />
        </div>
        <div className="grid grid-cols-2 gap-3 pt-2">
          <label><span className="label">I usually train at</span><input type="time" name="gymTime" defaultValue={minToHHMM(prefs.gymTimeMin)} className="input" /></label>
          <label><span className="label">Remind me</span>
            <select name="gymLead" defaultValue={prefs.gymLeadMin} className="input">
              {[15, 30, 60, 90, 120, 180].map((m) => <option key={m} value={m}>{m < 60 ? `${m} min` : `${m / 60} h`} before</option>)}
            </select>
          </label>
          <label><span className="label">Quiet from</span><input type="time" name="quietStart" defaultValue={minToHHMM(prefs.quietStartMin)} className="input" /></label>
          <label><span className="label">Quiet until</span><input type="time" name="quietEnd" defaultValue={minToHHMM(prefs.quietEndMin)} className="input" /></label>
        </div>
        <p className="text-xs text-muted">Times are in your timezone: <b>{prefs.timezone}</b> (detected from this device). Reminders that land in quiet hours wait until they end — or are dropped if they&apos;d arrive too late to be useful.</p>
        <FieldError>{state?.error}</FieldError>
        {state?.saved && <p className="text-sm text-success">Saved.</p>}
        <div className="flex gap-3 pt-2">
          <button className="btn-primary flex-1" disabled={pending}>{pending ? "Saving…" : "Save notification settings"}</button>
          <button type="button" className="btn-secondary" disabled={testing} onClick={() => startTest(async () => setTestMsg((await sendTestNotification()).message))}>Send test</button>
        </div>
        {testMsg && <p className="text-sm text-muted" role="status">{testMsg}</p>}
      </form>
    </div>
  );
}

/** Keeps the stored timezone in sync with the device. Mounted once in the app layout. */
export function TimezoneSync({ current, sync }: { current: string; sync: (tz: string) => Promise<void> }) {
  useEffect(() => {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz && tz !== current) sync(tz);
  }, [current, sync]);
  return null;
}
