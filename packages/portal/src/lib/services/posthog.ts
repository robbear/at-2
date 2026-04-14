import type { ServiceReport } from "./types";

const POSTHOG_HOST = "https://app.posthog.com";

interface HogQLResponse {
  results?: unknown[][];
  error?: string;
}

async function hogql(
  projectId: string,
  apiKey: string,
  query: string,
): Promise<unknown[][]> {
  const res = await fetch(`${POSTHOG_HOST}/api/projects/${projectId}/query`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query: { kind: "HogQLQuery", query } }),
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.text();
    console.error("[posthog] query error", res.status, body);
    throw new Error(`PostHog API error ${res.status}`);
  }

  const data = (await res.json()) as HogQLResponse;
  if (data.error) throw new Error(data.error);
  return data.results ?? [];
}

/**
 * Fetch total PostHog event consumption this month plus top event breakdown.
 * Free tier limit: 1,000,000 events/month.
 */
export async function fetchPostHogReport(): Promise<ServiceReport> {
  const apiKey = process.env.POSTHOG_PERSONAL_API_KEY;
  const projectId = process.env.POSTHOG_PROJECT_ID;

  if (!apiKey || !projectId) {
    return {
      name: "PostHog",
      status: "unknown",
      metrics: [
        { label: "Events this month", value: null, limit: 1_000_000, warningThreshold: 0.8, criticalThreshold: 0.95 },
      ],
      lastChecked: new Date(),
      note: "POSTHOG_PERSONAL_API_KEY / POSTHOG_PROJECT_ID not set",
    };
  }

  try {
    const [totalRows, topRows] = await Promise.all([
      hogql(projectId, apiKey, `
        SELECT count() FROM events WHERE timestamp >= toStartOfMonth(now())
      `),
      hogql(projectId, apiKey, `
        SELECT event, count() AS n
        FROM events
        WHERE timestamp >= toStartOfMonth(now())
        GROUP BY event
        ORDER BY n DESC
        LIMIT 8
      `),
    ]);

    const totalEvents = Number(totalRows[0]?.[0] ?? 0);
    console.log(`[posthog] total events this month: ${totalEvents}`);

    const topEvents = topRows
      .map((row) => `${String(row[0])}: ${Number(row[1]).toLocaleString()}`)
      .join(" · ");

    const limit = 1_000_000;
    const pct = totalEvents / limit;
    const status = pct >= 0.95 ? "critical" : pct >= 0.8 ? "warning" : "ok";

    return {
      name: "PostHog",
      status,
      metrics: [
        {
          label: "Events this month",
          value: totalEvents,
          limit,
          warningThreshold: 0.8,
          criticalThreshold: 0.95,
        },
      ],
      note: topEvents || undefined,
      lastChecked: new Date(),
    };
  } catch (err) {
    console.error("[posthog] fetch failed", err);
    return {
      name: "PostHog",
      status: "unknown",
      metrics: [],
      lastChecked: new Date(),
      error: err instanceof Error ? err.message : "Fetch failed",
    };
  }
}

/**
 * Fetch map_load count for a specific provider this month.
 * Used by the Mapbox and Google Maps service cards.
 */
export async function fetchMapLoadCount(provider: "mapbox" | "google"): Promise<number | null> {
  const apiKey = process.env.POSTHOG_PERSONAL_API_KEY;
  const projectId = process.env.POSTHOG_PROJECT_ID;
  if (!apiKey || !projectId) return null;

  try {
    const rows = await hogql(projectId, apiKey, `
      SELECT count()
      FROM events
      WHERE event = 'map_load'
        AND properties.provider = '${provider}'
        AND timestamp >= toStartOfMonth(now())
    `);
    return Number(rows[0]?.[0] ?? 0);
  } catch (err) {
    console.error(`[posthog] map load count (${provider}) failed`, err);
    return null;
  }
}
