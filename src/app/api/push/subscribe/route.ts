import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/db";
import { getCurrentUser } from "@/lib/auth";
import { track } from "@/lib/analytics";

export const runtime = "nodejs";

const sub = z.object({
  endpoint: z.url().max(2000),
  keys: z.object({ p256dh: z.string().min(10).max(200), auth: z.string().min(8).max(100) }),
});

/** Registers a browser push subscription for the signed-in user. */
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const parsed = sub.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 400 });
  const { endpoint, keys } = parsed.data;
  await db.insert(schema.pushSubscriptions).values({ endpoint, userId: user.id, p256dh: keys.p256dh, auth: keys.auth })
    .onConflictDoUpdate({ target: schema.pushSubscriptions.endpoint, set: { userId: user.id, p256dh: keys.p256dh, auth: keys.auth } });
  await track("push_enabled", user.id);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { endpoint } = (await req.json().catch(() => ({}))) as { endpoint?: string };
  if (endpoint) await db.delete(schema.pushSubscriptions).where(eq(schema.pushSubscriptions.endpoint, endpoint));
  return NextResponse.json({ ok: true });
}
