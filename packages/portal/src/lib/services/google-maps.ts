import type { ServiceReport } from "./types";

/**
 * Google Maps JS API usage data requires a GCP service account with
 * Monitoring Viewer role and Cloud Monitoring API access — non-trivial
 * to set up and in the same boat as Mapbox: better to self-track.
 *
 * Map load counts must be self-tracked: increment a counter in MongoDB
 * each time the Google Maps map initializes on the web side, then read it here.
 * See: packages/portal/src/lib/services/map-load-counts.ts (TODO)
 */
export async function fetchGoogleMapsReport(): Promise<ServiceReport> {
  const limit = 900; // hard monthly cap with $1 budget alert

  return {
    name: "Google Maps",
    status: "unknown",
    metrics: [
      {
        label: "JS API loads this month",
        value: null,
        limit,
        unit: "loads",
        warningThreshold: 0.7,
        criticalThreshold: 0.9,
      },
    ],
    lastChecked: new Date(),
    note: "Requires self-tracking — Cloud Monitoring API requires GCP service account",
  };
}
