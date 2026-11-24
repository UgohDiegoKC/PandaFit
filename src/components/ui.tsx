import clsx from "clsx";
import type { ReactNode } from "react";

export function Logo({ className }: { className?: string }) {
  return (
    <span className={clsx("inline-flex items-center gap-2 font-bold tracking-tight", className)}>
      <svg width="28" height="28" viewBox="0 0 32 32" aria-hidden>
        <circle cx="8" cy="8" r="5" fill="var(--accent)" />
        <circle cx="24" cy="8" r="5" fill="var(--accent)" />
        <circle cx="16" cy="18" r="12" fill="var(--accent)" />
        <ellipse cx="11" cy="17" rx="3" ry="3.6" fill="var(--on-accent)" />
        <ellipse cx="21" cy="17" rx="3" ry="3.6" fill="var(--on-accent)" />
        <ellipse cx="16" cy="23.5" rx="2.2" ry="1.4" fill="var(--on-accent)" />
      </svg>
      <span>
        Panda<span className="text-accent-ink">Fit</span>
      </span>
    </span>
  );
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: ReactNode; action?: ReactNode }) {
  return (
    <header className="mb-6 flex items-end justify-between gap-4">
      <div>
        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      </div>
      {action}
    </header>
  );
}

/** Stat strip cell — the "SETS / LAST TIME / BEST" pattern from the references. */
export function Stat({ label, value, sub }: { label: string; value: ReactNode; sub?: ReactNode }) {
  return (
    <div className="min-w-0 px-4 py-3">
      <div className="eyebrow">{label}</div>
      <div className="mt-1 truncate text-xl font-semibold">{value}</div>
      {sub && <div className="mt-0.5 truncate text-xs text-muted">{sub}</div>}
    </div>
  );
}

export function StatStrip({ children }: { children: ReactNode }) {
  return <div className="card grid grid-flow-col auto-cols-fr divide-x divide-line">{children}</div>;
}

/** Circular progress ring with a centred label (Workouts tile reference). */
export function Ring({ value, max, label, size = 52 }: { value: number; max: number; label: ReactNode; size?: number }) {
  const r = size / 2 - 3;
  const c = 2 * Math.PI * r;
  const pct = max ? Math.min(1, value / max) : 0;
  return (
    <div className="relative inline-grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} stroke="var(--surface-3)" strokeWidth="3" fill="none" />
        <circle cx={size / 2} cy={size / 2} r={r} stroke="var(--accent)" strokeWidth="3" fill="none" strokeLinecap="round" strokeDasharray={`${c * pct} ${c}`} />
      </svg>
      <span className="absolute text-sm font-semibold">{label}</span>
    </div>
  );
}

export function Badge({ children, tone = "default" }: { children: ReactNode; tone?: "default" | "accent" }) {
  return (
    <span className={clsx("inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium", tone === "accent" ? "bg-accent-soft text-accent-ink" : "bg-surface-2 text-muted")}>
      {children}
    </span>
  );
}

export function EmptyState({ title, body, action }: { title: string; body: string; action?: ReactNode }) {
  return (
    <div className="card flex flex-col items-center px-6 py-12 text-center">
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-muted">{body}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function FieldError({ children }: { children?: ReactNode }) {
  if (!children) return null;
  return <p role="alert" className="mt-1.5 text-sm text-danger">{children}</p>;
}
