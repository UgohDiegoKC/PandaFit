import Link from "next/link";
import { Logo } from "@/components/ui";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col px-5 py-6">
      <Link href="/" aria-label="PandaFit home"><Logo /></Link>
      <div className="flex flex-1 flex-col justify-center py-10">{children}</div>
    </main>
  );
}
