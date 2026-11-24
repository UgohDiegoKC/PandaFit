"use client";

import { useEffect, useState, useTransition } from "react";
import { Monitor, Moon, Sun } from "lucide-react";

export type ThemePref = "light" | "dark" | "system";
const KEY = "pf-theme";

/** Runs before paint (injected in <head>) so the saved theme applies with no flash. */
export const themeBootScript = `(function(){try{var p=localStorage.getItem('${KEY}')||document.documentElement.dataset.pref||'system';var d=p==='system'?(matchMedia('(prefers-color-scheme: light)').matches?'light':'dark'):p;document.documentElement.dataset.theme=d;}catch(e){document.documentElement.dataset.theme='dark';}})();`;

function resolve(pref: ThemePref) {
  if (pref !== "system") return pref;
  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

function apply(pref: ThemePref) {
  document.documentElement.dataset.theme = resolve(pref);
}

/**
 * Light / Dark / System switch. Saves locally immediately (works signed-out) and,
 * when `onPersist` is provided, to the account so the choice follows the user across devices.
 */
export function ThemeSwitch({ initial, onPersist }: { initial?: ThemePref; onPersist?: (p: ThemePref) => Promise<void> }) {
  const [pref, setPref] = useState<ThemePref>(initial ?? "system");
  const [, startTransition] = useTransition();

  useEffect(() => {
    const stored = (localStorage.getItem(KEY) as ThemePref | null) ?? initial ?? "system";
    // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrating from browser storage after SSR is intentional
    setPref(stored);
  }, [initial]);

  useEffect(() => {
    if (pref !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: light)");
    const onChange = () => apply("system");
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [pref]);

  const choose = (p: ThemePref) => {
    setPref(p);
    localStorage.setItem(KEY, p);
    apply(p);
    if (onPersist) startTransition(() => onPersist(p));
  };

  const opts: { value: ThemePref; label: string; Icon: typeof Sun }[] = [
    { value: "light", label: "Light", Icon: Sun },
    { value: "dark", label: "Dark", Icon: Moon },
    { value: "system", label: "System", Icon: Monitor },
  ];

  return (
    <div role="radiogroup" aria-label="Theme" className="grid grid-cols-3 gap-2">
      {opts.map(({ value, label, Icon }) => (
        <button
          key={value}
          type="button"
          role="radio"
          aria-checked={pref === value}
          data-active={pref === value}
          onClick={() => choose(value)}
          className="chip flex items-center justify-center gap-2"
        >
          <Icon size={16} aria-hidden /> {label}
        </button>
      ))}
    </div>
  );
}

/** Syncs the account's saved preference into this browser on first load after sign-in. */
export function ThemeSync({ pref }: { pref: ThemePref }) {
  useEffect(() => {
    if (!localStorage.getItem(KEY)) {
      localStorage.setItem(KEY, pref);
      apply(pref);
    }
  }, [pref]);
  return null;
}
