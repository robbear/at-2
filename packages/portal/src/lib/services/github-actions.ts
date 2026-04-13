import type { ServiceReport } from "./types";

/**
 * Fetch GitHub Actions usage for the atlasphere repo.
 *
 * TODO: Wire real data via the GitHub REST API.
 * Docs: https://docs.github.com/en/rest/actions/workflow-runs
 * Env vars needed:
 *   PORTAL_GITHUB_TOKEN — fine-grained PAT with Actions:Read on robbear/at-2
 *
 * GitHub Actions free tier (public repo): unlimited
 * GitHub Actions free tier (private repo): 2,000 min/month
 *
 * Useful endpoints:
 *   GET /repos/robbear/at-2/actions/runs?per_page=10  — recent workflow runs
 *   GET /repos/robbear/at-2/actions/billing/usage     — minutes used (if private)
 *
 * Things to surface:
 *   - Status of last CI run (success / failure / in_progress)
 *   - Minutes consumed this month (private repos only)
 *   - Last run timestamp
 */
export async function fetchGithubActionsReport(): Promise<ServiceReport> {
  // TODO: Replace stub once PORTAL_GITHUB_TOKEN is provisioned.

  return {
    name: "GitHub Actions",
    status: "unknown",
    metrics: [
      {
        label: "Last CI run",
        value: null,
        limit: null,
      },
    ],
    lastChecked: new Date(),
    note: "API integration pending — needs PORTAL_GITHUB_TOKEN",
  };
}
