import type { ServiceReport } from "./types";

/**
 * Fetch Railway service health and deployment status.
 *
 * TODO: Wire real data via the Railway GraphQL API.
 * Docs: https://docs.railway.app/reference/public-api
 * Endpoint: https://backboard.railway.app/graphql/v2
 * Env vars needed:
 *   PORTAL_RAILWAY_API_TOKEN — Railway API token
 *
 * Useful queries:
 *   project(id: "...") { services { ... } environments { ... } }
 *   deployments(projectId: "...") { status createdAt }
 *
 * Things to surface:
 *   - Current deployment status for production API service (ACTIVE / FAILED)
 *   - Last deployment timestamp
 *   - Resource usage if accessible (CPU, memory)
 */
export async function fetchRailwayReport(): Promise<ServiceReport> {
  // TODO: Replace stub once PORTAL_RAILWAY_API_TOKEN is provisioned.

  return {
    name: "Railway (API)",
    status: "unknown",
    metrics: [
      {
        label: "Production service",
        value: null,
        limit: null,
      },
    ],
    lastChecked: new Date(),
    note: "API integration pending — needs PORTAL_RAILWAY_API_TOKEN",
  };
}
