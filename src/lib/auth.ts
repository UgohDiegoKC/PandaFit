import "server-only";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { SignJWT, jwtVerify } from "jose";
import { hashPassword, verifyPassword } from "./password";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";

const COOKIE = "pf_session";
const MAX_AGE_SEC = 60 * 60 * 24 * 30;

function secret() {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 16) {
    if (process.env.NODE_ENV === "production") throw new Error("AUTH_SECRET must be set (>=16 chars) in production");
    return new TextEncoder().encode("dev-only-insecure-secret-change-me");
  }
  return new TextEncoder().encode(s);
}

export { hashPassword, verifyPassword };

/** Issues a signed token. Web uses it as an httpOnly cookie; iOS/Android will send it as a Bearer token. */
export async function issueToken(userId: string) {
  return new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE_SEC}s`)
    .sign(secret());
}

export async function startSession(userId: string) {
  const token = await issueToken(userId);
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_SEC,
  });
}

export async function endSession() {
  (await cookies()).delete(COOKIE);
}

async function readToken() {
  const fromCookie = (await cookies()).get(COOKIE)?.value;
  if (fromCookie) return fromCookie;
  const auth = (await headers()).get("authorization");
  return auth?.startsWith("Bearer ") ? auth.slice(7) : undefined;
}

export async function getUserId(): Promise<string | null> {
  const token = await readToken();
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    return typeof payload.sub === "string" ? payload.sub : null;
  } catch {
    return null;
  }
}

export async function getCurrentUser() {
  const id = await getUserId();
  if (!id) return null;
  const user = await db.query.users.findFirst({ where: eq(schema.users.id, id) });
  return user ?? null;
}

/** For pages: redirects to sign-in, or to onboarding if the profile isn't complete. */
export async function requireUser(opts: { allowUnonboarded?: boolean } = {}) {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");
  if (!opts.allowUnonboarded && !user.onboardedAt) redirect("/onboarding");
  return user;
}

/** For coach/admin pages. */
export async function requireRole(...roles: ("coach" | "admin")[]) {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");
  if (!roles.includes(user.role as "coach" | "admin")) redirect("/app");
  return user;
}
