import Link from "next/link";
import { Logo } from "./ui";

export function StaffShell({ role, children }: { role: string; children: React.ReactNode }) {
  return (
    <div className="min-h-dvh">
      <header className="border-b border-line">
        <div className="mx-auto flex max-w-5xl items-center gap-6 px-5 py-3">
          <Link href="/app"><Logo /></Link>
          <nav className="flex gap-4 text-sm text-muted">
            <Link href="/coach" className="hover:text-fg">Coach schedule</Link>
            {role === "admin" && <Link href="/admin" className="hover:text-fg">Admin</Link>}
            <Link href="/app" className="hover:text-fg">Back to app</Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-5 py-8">{children}</main>
    </div>
  );
}
