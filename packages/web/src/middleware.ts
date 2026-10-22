import { MAINTENANCE_HTML } from "./lib/maintenance-page";

/**
 * Maintenance gate. When MAINTENANCE_MODE=true, every route (pages, server
 * actions, /api/auth) returns the static vacation page with a 503 so search
 * engines treat the outage as temporary. Remove the env var and redeploy to
 * restore the site.
 */
export function middleware(): Response | undefined {
  if (process.env["MAINTENANCE_MODE"] !== "true") return undefined;

  return new Response(MAINTENANCE_HTML, {
    status: 503,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Retry-After": "86400",
      "Cache-Control": "no-store",
    },
  });
}

export const config = {
  // Let static assets through so the page's favicon loads.
  matcher: ["/((?!_next/static|_next/image|images/).*)"],
};
