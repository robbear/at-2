import type { ServiceReport } from "./types";

/**
 * Fetch Mapbox monthly map load count.
 *
 * TODO: Wire real data via the Mapbox Statistics API.
 * Docs: https://docs.mapbox.com/api/accounts/statistics/
 * Token: MAPBOX_SECRET_TOKEN (sk.* — not the public pk.* token)
 * Required scope: statistics:read
 *
 * Example response shape:
 *   GET https://api.mapbox.com/statistics/v1/usage?month=YYYY-MM
 *   Authorization: Bearer sk.***
 *   { "resources": [{ "resource_type": "StylesLoad", "count": 12345 }] }
 */
export async function fetchMapboxReport(): Promise<ServiceReport> {
  const limit = 50_000;
  const alertThreshold = parseInt(process.env.MAPBOX_ALERT_THRESHOLD ?? "40000", 10);

  // TODO: Replace stub with real fetch once MAPBOX_SECRET_TOKEN is provisioned.
  // const token = process.env.MAPBOX_SECRET_TOKEN;
  // if (token) { ... fetch real data ... }

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
    note: "API integration pending — needs MAPBOX_SECRET_TOKEN",
  };
}
