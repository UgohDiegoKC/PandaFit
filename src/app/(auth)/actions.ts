"use server";

import { createHash, randomBytes } from "node:crypto";
import { redirect } from "next/navigation";
import { and, eq, gt, isNull } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/db";
import { track } from "@/lib/analytics";
import { appUrl } from "@/lib/app-url";
import { emailProvider, sendEmail } from "@/lib/email";
import { endSession, hashPassword, startSession, verifyPassword } from "@/lib/auth";

export type FormState = { error?: string; fieldErrors?: Record<string, string>; message?: string; devLink?: string } | undefined;

const password = z
  .string()
  .min(10, "Use at least 10 characters.")
  .max(128)
  .refine((p) => /[A-Za-z]/.test(p) && /\d/.test(p), "Include at least one letter and one number.");

const signUpSchema = z.object({
  name: z.string().trim().min(1, "Tell us your name.").max(60),
  email: z.email("Enter a valid email.").transform((e) => e.toLowerCase().trim()),
  password,
  terms: z.literal("on", { error: "Please accept the terms to continue." }),
});

function fieldErrors(err: z.ZodError) {
  const out: Record<string, string> = {};
  for (const i of err.issues) out[String(i.path[0])] ??= i.message;
  return out;
}

export async function signUp(_: FormState, form: FormData): Promise<FormState> {
  const parsed = signUpSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) };
  const { name, email } = parsed.data;

  const existing = await db.query.users.findFirst({ where: eq(schema.users.email, email) });
  if (existing) return { fieldErrors: { email: "An account with this email already exists. Try signing in." } };

  const [user] = await db.insert(schema.users).values({ name, email, passwordHash: await hashPassword(parsed.data.password) }).returning();
  await track("signed_up", user.id);
  await startSession(user.id);
  redirect("/onboarding");
}

export async function signIn(_: FormState, form: FormData): Promise<FormState> {
  const email = String(form.get("email") ?? "").toLowerCase().trim();
  const pw = String(form.get("password") ?? "");
  const user = email ? await db.query.users.findFirst({ where: eq(schema.users.email, email) }) : undefined;
  // Same message whether the email exists or not (no account enumeration).
  if (!user || !(await verifyPassword(pw, user.passwordHash))) return { error: "That email and password don't match." };
  await startSession(user.id);
  redirect(user.onboardedAt ? "/app" : "/onboarding");
}

export async function signOut() {
  await endSession();
  redirect("/");
}

const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

export async function requestPasswordReset(_: FormState, form: FormData): Promise<FormState> {
  const email = String(form.get("email") ?? "").toLowerCase().trim();
  const generic = "If an account exists for that email, we've sent a reset link. It expires in 1 hour.";
  const user = email ? await db.query.users.findFirst({ where: eq(schema.users.email, email) }) : undefined;
  if (!user) return { message: generic };

  const token = randomBytes(32).toString("base64url");
  await db.insert(schema.passwordResetTokens).values({ tokenHash: sha256(token), userId: user.id, expiresAt: new Date(Date.now() + 3600_000) });
  const link = `${appUrl()}/reset-password?token=${token}`;

  await sendEmail({
    to: user.email,
    subject: "Reset your PandaFit password",
    text: `Hi ${user.name.split(" ")[0]},\n\nUse this link to choose a new password. It expires in 1 hour and works once:\n${link}\n\nIf you didn't ask for this, you can ignore this email — your password won't change.`,
  });
  // While EMAIL_PROVIDER=console in development, show the link on screen so the flow can be completed.
  const showLink = process.env.NODE_ENV !== "production" && emailProvider() === "console";
  return { message: generic, devLink: showLink ? link : undefined };
}

export async function resetPassword(_: FormState, form: FormData): Promise<FormState> {
  const token = String(form.get("token") ?? "");
  const parsed = password.safeParse(form.get("password"));
  if (!parsed.success) return { fieldErrors: { password: parsed.error.issues[0].message } };

  const row = await db.query.passwordResetTokens.findFirst({
    where: and(eq(schema.passwordResetTokens.tokenHash, sha256(token)), isNull(schema.passwordResetTokens.usedAt), gt(schema.passwordResetTokens.expiresAt, new Date())),
  });
  if (!row) return { error: "This reset link is invalid or has expired. Request a new one." };

  await db.update(schema.users).set({ passwordHash: await hashPassword(parsed.data) }).where(eq(schema.users.id, row.userId));
  await db.update(schema.passwordResetTokens).set({ usedAt: new Date() }).where(eq(schema.passwordResetTokens.tokenHash, row.tokenHash));
  await startSession(row.userId);
  redirect("/app");
}
