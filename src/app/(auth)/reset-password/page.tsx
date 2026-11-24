import Link from "next/link";
import { ResetForm } from "../forms";

export const metadata = { title: "Choose a new password" };

export default async function Page({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  return (
    <>
      <h1 className="text-3xl font-bold">Enter new password</h1>
      <p className="mb-8 mt-1 text-sm text-muted">Your new password must be different from the previous one.</p>
      {token ? <ResetForm token={token} /> : <p className="text-sm">This link is missing its token. <Link href="/forgot-password" className="text-accent-ink underline">Request a new one</Link>.</p>}
    </>
  );
}
