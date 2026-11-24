import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/db";
import { getCurrentUser } from "@/lib/auth";
import { CATALOG_BY_SLUG } from "@/lib/catalog";
import { track } from "@/lib/analytics";
import { detectPRs } from "@/lib/progress";

export const runtime = "nodejs";

const bodySchema = z.object({
  complete: z.boolean(),
  durationSec: z.number().int().min(0).max(6 * 3600),
  sets: z.array(z.object({
    exerciseSlug: z.string().refine((s) => CATALOG_BY_SLUG.has(s), "Unknown exercise"),
    setNumber: z.number().int().min(1).max(20),
    weightKg: z.number().min(0).max(600),
    reps: z.number().int().min(0).max(300),
    completed: z.boolean(),
  })).max(200),
});

async function ownSession(userId: string, id: string) {
  return db.query.workoutSessions.findFirst({ where: and(eq(schema.workoutSessions.id, id), eq(schema.workoutSessions.userId, userId)) });
}

/**
 * PUT /api/sessions/:id — save logged sets (idempotent: replaces the session's sets).
 * With complete=true, closes the session and records any new personal bests.
 */
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  const session = await ownSession(user.id, id);
  if (!session) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid", issues: parsed.error.issues.slice(0, 5) }, { status: 400 });
  const { sets, complete, durationSec } = parsed.data;

  const result = await db.transaction(async (tx) => {
    await tx.delete(schema.setLogs).where(eq(schema.setLogs.sessionId, id));
    if (sets.length) await tx.insert(schema.setLogs).values(sets.map((s) => ({ ...s, sessionId: id })));

    if (!complete) return { records: [] };

    const now = new Date();
    await tx.update(schema.workoutSessions).set({ completedAt: session.completedAt ?? now, durationSec }).where(eq(schema.workoutSessions.id, id));

    // PRs are only computed once per session to avoid duplicate celebrations on re-save.
    if (session.completedAt) return { records: [] };
    const slugs = [...new Set(sets.map((s) => s.exerciseSlug))];
    const existing = slugs.length
      ? (await tx.select().from(schema.personalRecords).where(eq(schema.personalRecords.userId, user.id))).filter((p) => slugs.includes(p.exerciseSlug))
      : [];
    const { records, baselines } = detectPRs(sets, existing);
    for (const pr of [...records, ...baselines]) {
      const values = { userId: user.id, exerciseSlug: pr.exerciseSlug, kind: pr.kind, value: pr.value, weightKg: pr.weightKg, reps: pr.reps, sessionId: id, achievedAt: now };
      await tx.insert(schema.personalRecords).values(values).onConflictDoUpdate({
        target: [schema.personalRecords.userId, schema.personalRecords.exerciseSlug, schema.personalRecords.kind],
        set: { value: pr.value, weightKg: pr.weightKg, reps: pr.reps, sessionId: id, achievedAt: now },
      });
    }
    return { records };
  });

  if (complete && !session.completedAt) {
    await track("workout_completed", user.id, { sets: sets.filter((s) => s.completed).length, minutes: Math.round(durationSec / 60), prs: result.records.length });
    for (const r of result.records) await track("pr_achieved", user.id, { kind: r.kind });
  }
  return NextResponse.json(result);
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  const session = await ownSession(user.id, id);
  if (!session) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (session.completedAt) return NextResponse.json({ error: "completed_sessions_are_kept" }, { status: 409 });
  await db.delete(schema.workoutSessions).where(eq(schema.workoutSessions.id, id));
  return NextResponse.json({ ok: true });
}
