import type { ServiceReport } from "./types";

/**
 * Fetch Vercel deployment and usage info.
 *
 * TODO: Wire real data via the Vercel REST API.
 * Docs: https://vercel.com/docs/rest-api
 * Env vars needed:
 *   PORTAL_VERCEL_API_TOKEN — Vercel API token with read access to the team
 *   PORTAL_VERCEL_TEAM_ID   — Team ID (from team settings URL)
 *
 * Useful endpoints:
 *   GET /v6/deployments?teamId=... — list recent deployments + status
 *   GET /v4/projects?teamId=...    — list projects (web + portal)
 *
 * Things to surface:
 *   - Last deployment status for web + portal (success / failed / building)
 *   - Last deployment timestamp
 *   - Build minutes consumed this month (if accessible)
 */
export async function fetchVercelReport(): Promise<ServiceReport> {
  // TODO: Replace stub once PORTAL_VERCEL_API_TOKEN is provisioned.

  return {
    name: "Vercel",
    status: "unknown",
    metrics: [
      {
        label: "Last deployment",
        value: null,
        limit: null,
      },
    ],
    lastChecked: new Date(),
    note: "API integration pending — needs PORTAL_VERCEL_API_TOKEN",
  };
}
