"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { CalendarDays, LayoutGrid, LineChart, UserRound } from "lucide-react";
import { Logo } from "./ui";

const ITEMS = [
  { href: "/app", label: "Home", Icon: LayoutGrid, exact: true },
  { href: "/app/plan", label: "Plan", Icon: CalendarDays },
  { href: "/app/progress", label: "Progress", Icon: LineChart },
  { href: "/app/profile", label: "You", Icon: UserRound },
];

export function AppNav({ avatar, name }: { avatar?: string | null; name: string }) {
  const path = usePathname();
  const active = (href: string, exact?: boolean) => (exact ? path === href : path.startsWith(href));
  // Hide chrome during an active workout so the logger gets the full screen.
  if (path.startsWith("/app/workout/") && !path.endsWith("/summary")) return null;

  return (
    <>
      <header className="sticky top-0 z-30 hidden border-b border-line bg-bg/85 backdrop-blur md:block">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3">
          <Link href="/app"><Logo /></Link>
          <nav className="flex gap-1" aria-label="Main">
            {ITEMS.map(({ href, label, Icon, exact }) => (
              <Link key={href} href={href} aria-current={active(href, exact) ? "page" : undefined}
                className={clsx("flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition", active(href, exact) ? "bg-accent text-on-accent" : "text-muted hover:text-fg")}>
                <Icon size={16} aria-hidden /> {label}
              </Link>
            ))}
          </nav>
          <Link href="/app/profile" className="flex items-center gap-2 text-sm text-muted">
            {avatar ? <img src={avatar} alt="" className="size-8 rounded-full object-cover" /> : <span className="grid size-8 place-items-center rounded-full bg-surface-2 font-semibold text-fg">{name[0]?.toUpperCase()}</span>}
          </Link>
        </div>
      </header>

      <nav aria-label="Main" className="fixed inset-x-4 bottom-4 z-30 mx-auto flex max-w-sm justify-around rounded-full border border-line-strong bg-surface/90 p-2 shadow-2xl backdrop-blur md:hidden">
        {ITEMS.map(({ href, label, Icon, exact }) => (
          <Link key={href} href={href} aria-label={label} aria-current={active(href, exact) ? "page" : undefined}
            className={clsx("grid size-12 place-items-center rounded-full transition", active(href, exact) ? "bg-accent text-on-accent" : "text-muted")}>
            <Icon size={20} aria-hidden />
          </Link>
        ))}
      </nav>
    </>
  );
}
