import Link from "next/link";
import { SignUpForm } from "../forms";

export const metadata = { title: "Sign up" };

export default function Page() {
  return (
    <>
      <h1 className="text-3xl font-bold">Sign up</h1>
      <p className="mb-8 mt-1 text-sm text-muted">Create your account — your personalised plan comes next.</p>
      <SignUpForm />
      <p className="mt-6 text-center text-sm text-muted">Already have an account? <Link href="/sign-in" className="text-accent-ink hover:underline">Sign in</Link></p>
    </>
  );
}
