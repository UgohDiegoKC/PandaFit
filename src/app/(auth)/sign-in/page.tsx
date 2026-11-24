import Link from "next/link";
import { SignInForm } from "../forms";

export const metadata = { title: "Sign in" };

export default function Page() {
  return (
    <>
      <h1 className="text-3xl font-bold">Sign in</h1>
      <p className="mb-8 mt-1 text-sm text-muted">Welcome back. Let&apos;s get today&apos;s session done.</p>
      <SignInForm />
      <p className="mt-6 text-center text-sm text-muted">New here? <Link href="/sign-up" className="text-accent-ink hover:underline">Create an account</Link></p>
    </>
  );
}
