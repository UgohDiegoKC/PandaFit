import { desc } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireRole } from "@/lib/auth";
import { emailProvider } from "@/lib/email";
import { productMetrics } from "@/lib/metrics";
import { pushConfigured } from "@/lib/notify/push";
import { StaffShell } from "@/components/staff-shell";
import { Badge, PageHeader } from "@/components/ui";
import { ProToggle, RoleSelect, RunReminders } from "./client";

export const metadata = { title: "Admin" };
const pct = (n: number | null) => (n === null ? "—" : `${Math.round(n * 100)}%`);

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const admin = await requireRole("admin");
  const { q = "" } = await searchParams;
  const [m, allUsers, outbox] = await Promise.all([
    productMetrics(),
    db.select().from(schema.users).orderBy(desc(schema.users.createdAt)).limit(200),
    db.select().from(schema.emailOutbox).orderBy(desc(schema.emailOutbox.createdAt)).limit(15),
  ]);
  const users = q ? allUsers.filter((u) => (u.name + u.email).toLowerCase().includes(q.toLowerCase())) : allUsers;
  const top = Math.max(1, m.funnel[0].n);

  return (
    <StaffShell role={admin.role}>
      <PageHeader title="Admin" subtitle={`Email: ${emailProvider()} · Push: ${pushConfigured() ? "configured" : "not configured (set VAPID keys)"}`} />

      <section className="mb-6 grid gap-4 md:grid-cols-4">
        {[
          ["Weekly active", m.weeklyActive],
          ["Workout completion", pct(m.workoutCompletionRate)],
          ["Pro members", m.proUsers],
          [`Bookings (${m.days}d)`, m.bookingsCreated],
        ].map(([k, v]) => (
          <div key={k} className="card p-4"><div className="eyebrow">{k}</div><div className="mt-1 text-2xl font-bold">{v}</div></div>
        ))}
      </section>

      <section className="card mb-6 p-5">
        <h2 className="mb-4 font-semibold">Activation funnel · sign-ups in the last {m.days} days</h2>
        <ol className="space-y-2">
          {m.funnel.map((f) => (
            <li key={f.step} className="grid grid-cols-[12rem_1fr_4rem] items-center gap-3 text-sm">
              <span>{f.step}</span>
              <span className="h-3 rounded-full bg-surface-2"><span className="block h-3 rounded-full bg-accent" style={{ width: `${(f.n / top) * 100}%` }} /></span>
              <span className="text-right tabular-nums">{f.n} <span className="text-muted">{m.funnel[0].n ? pct(f.n / m.funnel[0].n) : ""}</span></span>
            </li>
          ))}
        </ol>
      </section>

      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <section className="card p-5">
          <h2 className="mb-2 font-semibold">AI plan generation</h2>
          {m.ai.length === 0 ? <p className="text-sm text-muted">No generations yet.</p> : (
            <ul className="space-y-1 text-sm">{m.ai.map((a) => <li key={a.outcome} className="flex justify-between"><span>{a.outcome}</span><span className="tabular-nums">{a.n} · {Math.round(Number(a.avgMs))} ms</span></li>)}</ul>
          )}
        </section>
        <section className="card p-5">
          <h2 className="mb-2 font-semibold">Notifications (7d)</h2>
          {m.notifications.length === 0 ? <p className="text-sm text-muted">None yet.</p> : (
            <ul className="space-y-1 text-sm">{m.notifications.map((n) => <li key={n.status} className="flex justify-between"><span>{n.status}</span><span>{n.n}</span></li>)}</ul>
          )}
          <div className="mt-3"><RunReminders /></div>
        </section>
        <section className="card p-5">
          <h2 className="mb-2 font-semibold">Events ({m.days}d)</h2>
          <ul className="max-h-48 space-y-1 overflow-auto text-sm">{m.events.map((e) => <li key={e.name} className="flex justify-between"><span>{e.name}</span><span>{e.n}</span></li>)}</ul>
        </section>
      </div>

      <section className="card mb-6 p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-semibold">Users</h2>
          <form><input name="q" defaultValue={q} placeholder="Search name or email" className="input py-2" /></form>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-muted"><tr><th className="py-2 font-medium">Name</th><th className="font-medium">Email</th><th className="font-medium">Joined</th><th className="font-medium">Status</th><th className="font-medium">Pro</th><th className="font-medium">Role</th></tr></thead>
            <tbody className="divide-y divide-line">
              {users.map((u) => (
                <tr key={u.id}>
                  <td className="py-2">{u.name}</td>
                  <td className="text-muted">{u.email}</td>
                  <td className="text-muted">{u.createdAt.toISOString().slice(0, 10)}</td>
                  <td>{u.onboardedAt ? <Badge>Onboarded</Badge> : <Badge>Signed up</Badge>}</td>
                  <td><ProToggle userId={u.id} isPro={u.isPro} label={u.name} /></td>
                  <td><RoleSelect userId={u.id} role={u.role} label={u.name} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card p-5">
        <h2 className="mb-3 font-semibold">Recent emails</h2>
        {outbox.length === 0 ? <p className="text-sm text-muted">No emails yet.</p> : (
          <ul className="divide-y divide-line text-sm">
            {outbox.map((e) => (
              <li key={e.id} className="py-2">
                <details>
                  <summary className="flex cursor-pointer flex-wrap gap-x-3"><span className="font-medium">{e.subject}</span><span className="text-muted">→ {e.to}</span><span className="text-muted">{e.createdAt.toISOString().slice(0, 16).replace("T", " ")}</span>{e.status === "failed" && <span className="text-danger">failed: {e.error}</span>}</summary>
                  <pre className="mt-2 whitespace-pre-wrap rounded-lg bg-surface-2 p-3 text-xs text-muted">{e.text}</pre>
                </details>
              </li>
            ))}
          </ul>
        )}
      </section>
    </StaffShell>
  );
}
