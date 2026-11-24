import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center px-5 text-center">
      <p className="eyebrow text-accent-ink">404</p>
      <h1 className="mt-2 text-3xl font-bold">We couldn&apos;t find that</h1>
      <p className="mt-2 text-sm text-muted">The page may have moved, or the workout was replaced when your plan changed.</p>
      <Link href="/app" className="btn-primary mt-6">Go home</Link>
    </main>
  );
}
