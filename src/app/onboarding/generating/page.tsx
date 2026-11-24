import { requireUser } from "@/lib/auth";
import { Generator } from "./generator";

export const metadata = { title: "Building your plan" };

export default async function GeneratingPage({ searchParams }: { searchParams: Promise<{ regenerate?: string }> }) {
  await requireUser();
  const { regenerate } = await searchParams;
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-5 py-10">
      <Generator regenerate={regenerate === "1"} />
    </main>
  );
}
