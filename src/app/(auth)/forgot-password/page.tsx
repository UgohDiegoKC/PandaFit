import Link from "next/link";
import { ForgotForm } from "../forms";

export const metadata = { title: "Reset password" };

export default function Page() {
  return (
    <>
      <h1 className="text-3xl font-bold">Reset password</h1>
      <p className="mb-8 mt-1 text-sm text-muted">Enter the email on your account and we&apos;ll send a reset link.</p>
      <ForgotForm />
      <p className="mt-6 text-center text-sm text-muted"><Link href="/sign-in" className="text-accent-ink hover:underline">Back to sign in</Link></p>
    </>
  );
}
