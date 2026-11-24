import { eq } from "drizzle-orm";
import { Download, LogOut } from "lucide-react";
import { db, schema } from "@/db";
import { requireUser } from "@/lib/auth";
import { fromCm, fromKg } from "@/lib/units";
import { PageHeader } from "@/components/ui";
import { signOut } from "../../(auth)/actions";
import { Questionnaire } from "../../onboarding/questionnaire";
import { AvatarEditor, DeleteAccount, ThemeSetting } from "./client";
import { NotificationSettings } from "./notifications";
import { getPrefs } from "@/lib/notify/service";
import { vapidPublicKey } from "@/lib/notify/push";
import { updateName } from "./actions";

export const metadata = { title: "Profile" };

export default async function ProfilePage({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  const user = await requireUser();
  const { saved } = await searchParams;
  const [profile, prefs] = await Promise.all([db.query.profiles.findFirst({ where: eq(schema.profiles.userId, user.id) }), getPrefs(user.id)]);
  const u = user.unitSystem;
  const r1 = (n: number) => Math.round(n * 10) / 10;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader title="Profile" />
      {saved && <p className="card border-accent/40 bg-accent-faint p-3 text-sm">Saved. <a href="/onboarding/generating?regenerate=1" className="font-semibold text-accent-ink underline">Regenerate your plan</a> to apply the new answers.</p>}

      <section className="card space-y-5 p-5">
        <AvatarEditor name={user.name} avatar={user.avatarDataUrl} />
        <form action={updateName} className="flex items-end gap-3">
          <label className="flex-1"><span className="label">Name</span><input name="name" defaultValue={user.name} maxLength={60} className="input" /></label>
          <button className="btn-secondary">Save</button>
        </form>
        <div className="text-sm text-muted">{user.email}</div>
      </section>

      <section className="card p-5">
        <h2 className="mb-3 font-semibold">Appearance</h2>
        <ThemeSetting initial={user.themePreference} />
        <p className="mt-2 text-xs text-muted">Saved to your account and applied on every device you sign in on.</p>
      </section>

      <section id="notifications" className="card p-5">
        <h2 className="mb-3 font-semibold">Notifications</h2>
        <NotificationSettings vapidKey={vapidPublicKey()} prefs={{
          timezone: prefs.timezone, emailEnabled: prefs.emailEnabled, pushEnabled: prefs.pushEnabled, gymReminders: prefs.gymReminders,
          gymTimeMin: prefs.gymTimeMin, gymLeadMin: prefs.gymLeadMin, breakReminders: prefs.breakReminders, checkinReminders: prefs.checkinReminders,
          quietStartMin: prefs.quietStartMin, quietEndMin: prefs.quietEndMin,
        }} />
      </section>

      <section id="training" className="card p-5">
        <h2 className="mb-1 font-semibold">Training profile</h2>
        <p className="mb-5 text-sm text-muted">These answers personalise your plan.</p>
        {profile && (
          <Questionnaire mode="profile" defaults={{
            age: profile.age, sex: profile.sex, unitSystem: u, weight: r1(fromKg(profile.weightKg, u)), height: r1(fromCm(profile.heightCm, u)),
            goal: profile.goal, experience: profile.experience, gymDays: profile.gymDays, sessionMinutes: profile.sessionMinutes, limitations: profile.limitations,
          }} />
        )}
      </section>

      <nav className="card divide-y divide-line" aria-label="More">
        <a href="/app/coach" className="flex justify-between p-4 text-sm hover:text-accent-ink"><span>Coach check-ins {user.isPro ? "" : "(Pro)"}</span><span aria-hidden>→</span></a>
        <a href="/app/nutrition" className="flex justify-between p-4 text-sm hover:text-accent-ink"><span>Food guidance</span><span aria-hidden>→</span></a>
        {(user.role === "coach" || user.role === "admin") && <a href="/coach" className="flex justify-between p-4 text-sm hover:text-accent-ink"><span>Coach schedule</span><span aria-hidden>→</span></a>}
        {user.role === "admin" && <a href="/admin" className="flex justify-between p-4 text-sm hover:text-accent-ink"><span>Admin</span><span aria-hidden>→</span></a>}
      </nav>

      <section className="card space-y-3 p-5">
        <h2 className="font-semibold">Your data</h2>
        <p className="text-sm text-muted">Download everything PandaFit stores about you as JSON.</p>
        <a href="/api/me/export" className="btn-secondary"><Download size={16} aria-hidden /> Export my data</a>
      </section>

      <form action={signOut}><button className="btn-secondary w-full"><LogOut size={16} aria-hidden /> Sign out</button></form>
      <DeleteAccount />
    </div>
  );
}
