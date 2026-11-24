import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { Logo } from "@/components/ui";
import { Questionnaire } from "./questionnaire";

export const metadata = { title: "Build your plan" };

export default async function OnboardingPage() {
  const user = await requireUser({ allowUnonboarded: true });
  if (user.onboardedAt) redirect("/app");
  return (
    <main className="mx-auto min-h-dvh max-w-lg px-5 py-6">
      <Link href="/"><Logo /></Link>
      <p className="mb-6 mt-8 text-sm text-muted">Hi {user.name.split(" ")[0]} — a few questions and your coach will build your first plan.</p>
      <Questionnaire />
    </main>
  );
}
