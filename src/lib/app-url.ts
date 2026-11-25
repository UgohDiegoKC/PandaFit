/**
 * Public base URL for links in emails and notifications.
 * APP_URL wins when set. On Vercel it can be left unset: production uses the project's
 * production domain, and previews use their branch URL (both provided by Vercel automatically).
 */
export function appUrl(): string {
  const explicit = process.env.APP_URL?.trim();
  if (explicit) return explicit.replace(/\/+$/, "");
  const vercelHost =
    (process.env.VERCEL_ENV === "production" && process.env.VERCEL_PROJECT_PRODUCTION_URL) ||
    process.env.VERCEL_BRANCH_URL ||
    process.env.VERCEL_URL;
  return vercelHost ? `https://${vercelHost}` : "http://localhost:3000";
}
