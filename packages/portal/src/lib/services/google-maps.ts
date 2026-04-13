import type { ServiceReport } from "./types";

/**
 * Fetch Google Maps JS API monthly load count.
 *
 * TODO: Wire real data via the Google Cloud Monitoring API.
 * The Maps JS API usage is exposed as the metric:
 *   serviceruntime.googleapis.com/api/request_count
 *   filtered by service=maps-backend.googleapis.com
 * Docs: https://cloud.google.com/monitoring/api/ref_v3/rest/v3/projects.timeSeries/list
 *
 * Auth: Google Cloud service account with "Monitoring Viewer" role.
 * Env vars needed:
 *   GOOGLE_CLOUD_SA_KEY_BASE64 — base64-encoded service account JSON key
 *   GOOGLE_CLOUD_PROJECT_ID    — GCP project ID
 *
 * Alternative: Google Cloud Billing API for cost-based alerting, but
 * Monitoring gives raw load counts which map directly to the 900/month cap.
 */
export async function fetchGoogleMapsReport(): Promise<ServiceReport> {
  const limit = 900; // hard monthly cap with $1 budget alert

  // TODO: Replace stub with real fetch once SA key is provisioned.

  return {
    name: "Google Maps",
    status: "unknown",
    metrics: [
      {
        label: "JS API loads this month",
        value: null,
        limit,
        unit: "loads",
        warningThreshold: 0.7, // warn at 630 loads
        criticalThreshold: 0.9, // critical at 810 loads
      },
    ],
    lastChecked: new Date(),
    note: "API integration pending — needs GOOGLE_CLOUD_SA_KEY_BASE64",
  };
}
