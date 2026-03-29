/**
 * Returns the canonical base URL of this deployment.
 *
 * Priority:
 * 1. NEXT_PUBLIC_SITE_URL — set explicitly in Vercel production env
 *    (e.g. https://atlasphere.app after DNS cutover)
 * 2. VERCEL_URL — injected automatically by Vercel for all deployments
 *    including preview branches (no protocol — we add https://)
 * 3. http://localhost:3000 — local dev fallback
 */
export function getBaseUrl(): string {
  if (process.env["NEXT_PUBLIC_SITE_URL"]) {
    return process.env["NEXT_PUBLIC_SITE_URL"];
  }
  if (process.env["VERCEL_URL"]) {
    return `https://${process.env["VERCEL_URL"]}`;
  }
  return "http://localhost:3000";
}
