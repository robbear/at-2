import type { ServiceReport } from "./types";

/**
 * Mapbox Statistics API (statistics/v1/{username}/map-loads) returns
 * 401 "Direct access not allowed" regardless of token scopes — it is a
 * private/internal API used only by Mapbox's own dashboard.
 *
 * Map load counts must be self-tracked: increment a counter in MongoDB
 * each time the Mapbox map initializes on the web side, then read it here.
 * See: packages/portal/src/lib/services/map-load-counts.ts (TODO)
 */
export async function fetchMapboxReport(): Promise<ServiceReport> {
  const limit = 50_000;
  const alertThreshold = parseInt(process.env.MAPBOX_ALERT_THRESHOLD ?? "40000", 10);

  return {
    name: "Mapbox",
    status: "unknown",
    metrics: [
      {
        label: "Map loads this month",
        value: null,
        limit,
        unit: "loads",
        warningThreshold: alertThreshold / limit,
        criticalThreshold: 0.95,
      },
    ],
    lastChecked: new Date(),
    note: "Requires self-tracking — Mapbox Statistics API is not publicly accessible",
  };
}
