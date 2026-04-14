import type { ServiceReport } from "./types";
import { fetchMapLoadCount } from "./posthog";

export async function fetchMapboxReport(): Promise<ServiceReport> {
  const limit = 50_000;
  const alertThreshold = parseInt(process.env.MAPBOX_ALERT_THRESHOLD ?? "40000", 10);

  const mapLoads = await fetchMapLoadCount("mapbox");
  const pct = mapLoads !== null ? mapLoads / limit : null;
  const status =
    pct === null
      ? "unknown"
      : pct >= 0.95
        ? "critical"
        : pct >= alertThreshold / limit
          ? "warning"
          : "ok";

  return {
    name: "Mapbox",
    status,
    metrics: [
      {
        label: "Map loads this month",
        value: mapLoads,
        limit,
        unit: "loads",
        warningThreshold: alertThreshold / limit,
        criticalThreshold: 0.95,
      },
    ],
    lastChecked: new Date(),
    note: mapLoads === null ? "POSTHOG_PERSONAL_API_KEY / POSTHOG_PROJECT_ID not set" : undefined,
  };
}
