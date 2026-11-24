import { requireUser } from "@/lib/auth";
import { AppNav } from "@/components/app-nav";
import { ThemeSync } from "@/components/theme";
import { getPrefs } from "@/lib/notify/service";
import { syncTimezone } from "./profile/actions";
import { TimezoneSync } from "./profile/notifications";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const prefs = await getPrefs(user.id);
  return (
    <>
      <ThemeSync pref={user.themePreference} />
      <TimezoneSync current={prefs.timezone} sync={syncTimezone} />
      <AppNav avatar={user.avatarDataUrl} name={user.name} />
      <main className="mx-auto max-w-5xl px-5 pb-32 pt-6 md:px-6 md:pb-16 md:pt-10">{children}</main>
    </>
  );
}
