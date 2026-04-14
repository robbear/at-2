import type { ServiceReport } from "./types";
import { fetchMapLoadCount } from "./posthog";

export async function fetchGoogleMapsReport(): Promise<ServiceReport> {
  const limit = 900; // hard monthly cap with $1 budget alert

  const mapLoads = await fetchMapLoadCount("google");
  const pct = mapLoads !== null ? mapLoads / limit : null;
  const status =
    pct === null
      ? "unknown"
      : pct >= 0.9
        ? "critical"
        : pct >= 0.7
          ? "warning"
          : "ok";

  return {
    name: "Google Maps",
    status,
    metrics: [
      {
        label: "JS API loads this month",
        value: mapLoads,
        limit,
        unit: "loads",
        warningThreshold: 0.7,
        criticalThreshold: 0.9,
      },
    ],
    lastChecked: new Date(),
    note: mapLoads === null ? "POSTHOG_PERSONAL_API_KEY / POSTHOG_PROJECT_ID not set" : undefined,
  };
}
