import "server-only";
import { db, schema } from "@/db";

/**
 * Provider-agnostic email sender.
 *   EMAIL_PROVIDER=console  (default) — prints the email to server logs and records it in email_outbox
 *   EMAIL_PROVIDER=resend   — needs RESEND_API_KEY
 *   EMAIL_PROVIDER=sendgrid — needs SENDGRID_API_KEY
 * Every attempt is recorded in email_outbox (visible to admins at /admin).
 */
export interface Email { to: string; subject: string; text: string }
export type SendResult = { ok: true } | { ok: false; error: string };

const FROM = () => process.env.EMAIL_FROM || "PandaFit <no-reply@pandafit.app>";

async function viaResend(e: Email): Promise<SendResult> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { ok: false, error: "RESEND_API_KEY not set" };
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
    body: JSON.stringify({ from: FROM(), to: [e.to], subject: e.subject, text: e.text }),
    signal: AbortSignal.timeout(10_000),
  });
  return res.ok ? { ok: true } : { ok: false, error: `resend ${res.status}: ${(await res.text()).slice(0, 200)}` };
}

async function viaSendgrid(e: Email): Promise<SendResult> {
  const key = process.env.SENDGRID_API_KEY;
  if (!key) return { ok: false, error: "SENDGRID_API_KEY not set" };
  const m = /^(.*)<(.+)>$/.exec(FROM());
  const from = m ? { name: m[1].trim(), email: m[2].trim() } : { email: FROM() };
  const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
    body: JSON.stringify({ personalizations: [{ to: [{ email: e.to }] }], from, subject: e.subject, content: [{ type: "text/plain", value: e.text }] }),
    signal: AbortSignal.timeout(10_000),
  });
  return res.ok ? { ok: true } : { ok: false, error: `sendgrid ${res.status}: ${(await res.text()).slice(0, 200)}` };
}

export function emailProvider() {
  return (process.env.EMAIL_PROVIDER || "console").toLowerCase();
}

export async function sendEmail(e: Email): Promise<SendResult> {
  const provider = emailProvider();
  let result: SendResult;
  try {
    if (provider === "resend") result = await viaResend(e);
    else if (provider === "sendgrid") result = await viaSendgrid(e);
    else {
      console.info(`[email:console] to=${e.to} subject="${e.subject}"\n${e.text}\n`);
      result = { ok: true };
    }
  } catch (err) {
    result = { ok: false, error: err instanceof Error ? err.message : "send failed" };
  }
  await db.insert(schema.emailOutbox).values({
    to: e.to, subject: e.subject, text: e.text, provider, status: result.ok ? "sent" : "failed", error: result.ok ? null : result.error,
  }).catch(() => {});
  return result;
}
