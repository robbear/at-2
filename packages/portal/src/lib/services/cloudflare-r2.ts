import type { ServiceReport } from "./types";

/**
 * Fetch Cloudflare R2 storage and operation metrics.
 *
 * TODO: Wire real data via the Cloudflare GraphQL Analytics API.
 * Docs: https://developers.cloudflare.com/analytics/graphql-api/
 * Endpoint: https://api.cloudflare.com/client/v4/graphql
 * Env vars needed:
 *   CLOUDFLARE_API_TOKEN — Cloudflare API token with Account Analytics:Read
 *   R2_ACCOUNT_ID        — already in .env.local (reuse this)
 *
 * Note: R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY are S3-compatible credentials
 * for object operations; they do NOT work for the Analytics API. A separate
 * Cloudflare API token is required.
 *
 * R2 free tier limits:
 *   Storage:       10 GB/month
 *   Class A ops:  1,000,000/month (writes, lists)
 *   Class B ops: 10,000,000/month (reads)
 *   Egress:        free (to internet)
 *
 * GraphQL dataset: r2OperationsAdaptiveGroups
 * Fields: actionType, requests, objectSize
 */
export async function fetchCloudflareR2Report(): Promise<ServiceReport> {
  // TODO: Replace stub once CLOUDFLARE_API_TOKEN is provisioned.

  return {
    name: "Cloudflare R2",
    status: "unknown",
    metrics: [
      {
        label: "Storage used",
        value: null,
        limit: 10_240,
        unit: "MB",
        warningThreshold: 0.8,
        criticalThreshold: 0.95,
      },
      {
        label: "Class A ops this month",
        value: null,
        limit: 1_000_000,
        unit: "ops",
        warningThreshold: 0.8,
      },
      {
        label: "Class B ops this month",
        value: null,
        limit: 10_000_000,
        unit: "ops",
        warningThreshold: 0.8,
      },
    ],
    lastChecked: new Date(),
    note: "API integration pending — needs CLOUDFLARE_API_TOKEN",
  };
}
