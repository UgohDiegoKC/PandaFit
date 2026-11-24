import "server-only";
import * as webpush from "web-push";

/** Web Push (VAPID). Generate keys once with `npm run vapid` and set them in the environment. */
let configured: boolean | null = null;

export function pushConfigured() {
  if (configured !== null) return configured;
  const pub = process.env.VAPID_PUBLIC_KEY, priv = process.env.VAPID_PRIVATE_KEY;
  configured = !!(pub && priv);
  if (configured) webpush.setVapidDetails(process.env.VAPID_SUBJECT || "mailto:support@pandafit.app", pub!, priv!);
  return configured;
}

export const vapidPublicKey = () => process.env.VAPID_PUBLIC_KEY || null;

export type PushResult = "sent" | "gone" | "failed";

export async function sendPush(sub: { endpoint: string; p256dh: string; auth: string }, payload: { title: string; body: string; url: string }): Promise<PushResult> {
  if (!pushConfigured()) return "failed";
  try {
    await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, JSON.stringify(payload), { TTL: 6 * 3600 });
    return "sent";
  } catch (e) {
    const code = (e as { statusCode?: number }).statusCode;
    return code === 404 || code === 410 ? "gone" : "failed";
  }
}
