import type { ServiceReport } from "./types";

/**
 * Fetch MongoDB Atlas cluster metrics.
 *
 * TODO: Wire real data via the Atlas Admin API.
 * Docs: https://www.mongodb.com/docs/atlas/reference/api-resources-spec/v2/
 * Auth: HTTP Digest with public/private key pair (not bearer token).
 * Env vars needed:
 *   ATLAS_PUBLIC_KEY  — Atlas API public key
 *   ATLAS_PRIVATE_KEY — Atlas API private key
 *   ATLAS_ORG_ID      — Organization ID
 *   ATLAS_PROJECT_ID  — Project ID (formerly "group ID")
 *
 * Useful endpoints:
 *   GET /api/atlas/v2/groups/{groupId}/clusters               — cluster status
 *   GET /api/atlas/v2/groups/{groupId}/clusters/{clusterName}/measurements
 *       ?granularity=P1D&m=CONNECTIONS&m=DATA_SIZE_TOTAL      — usage metrics
 *
 * Things to surface:
 *   - Cluster state (IDLE / REPLICATING / etc.)
 *   - Storage used vs. M0 512 MB soft limit
 *   - Active connections
 */
export async function fetchAtlasReport(): Promise<ServiceReport> {
  // TODO: Replace stub once Atlas API keys are provisioned.

  return {
    name: "MongoDB Atlas",
    status: "unknown",
    metrics: [
      {
        label: "Storage used",
        value: null,
        limit: 512,
        unit: "MB",
        warningThreshold: 0.75,
        criticalThreshold: 0.9,
      },
      {
        label: "Connections",
        value: null,
        limit: 500,
        warningThreshold: 0.8,
      },
    ],
    lastChecked: new Date(),
    note: "API integration pending — needs ATLAS_PUBLIC_KEY + ATLAS_PRIVATE_KEY",
  };
}
