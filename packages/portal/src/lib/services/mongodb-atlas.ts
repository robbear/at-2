import { createHash } from "crypto";
import type { ServiceReport } from "./types";

/**
 * Atlas Admin API uses HTTP Digest authentication.
 * Docs: https://www.mongodb.com/docs/atlas/reference/api-resources-spec/v2/
 */

const ATLAS_API = "https://cloud.mongodb.com/api/atlas/v2";

async function digestFetch(
  url: string,
  publicKey: string,
  privateKey: string,
): Promise<Response> {
  // Step 1: unauthenticated request to get the Digest challenge
  const probe = await fetch(url, {
    headers: { Accept: "application/vnd.atlas.2023-01-01+json" },
    cache: "no-store",
  });

  if (probe.status !== 401) {
    // Unexpected — return as-is so caller can handle it
    return probe;
  }

  const wwwAuth = probe.headers.get("www-authenticate") ?? "";
  const realm = /realm="([^"]+)"/.exec(wwwAuth)?.[1] ?? "";
  const nonce = /nonce="([^"]+)"/.exec(wwwAuth)?.[1] ?? "";
  const qop = /qop="?([^",\s]+)"?/.exec(wwwAuth)?.[1] ?? "";

  const cnonce = createHash("md5").update(String(Math.random())).digest("hex");
  const nc = "00000001";
  const method = "GET";
  const uri = new URL(url).pathname + new URL(url).search;

  const ha1 = createHash("md5").update(`${publicKey}:${realm}:${privateKey}`).digest("hex");
  const ha2 = createHash("md5").update(`${method}:${uri}`).digest("hex");
  const responseHash = createHash("md5")
    .update(`${ha1}:${nonce}:${nc}:${cnonce}:${qop}:${ha2}`)
    .digest("hex");

  const authHeader =
    `Digest username="${publicKey}", realm="${realm}", nonce="${nonce}", ` +
    `uri="${uri}", qop=${qop}, nc=${nc}, cnonce="${cnonce}", response="${responseHash}"`;

  return fetch(url, {
    headers: {
      Authorization: authHeader,
      Accept: "application/vnd.atlas.2023-01-01+json",
    },
    cache: "no-store",
  });
}

interface AtlasCluster {
  name: string;
  stateName: string;
}

interface AtlasClustersResponse {
  results?: AtlasCluster[];
}

interface AtlasMeasurement {
  name: string;
  dataPoints: { value: number | null; timestamp: string }[];
}

interface AtlasMeasurementsResponse {
  measurements?: AtlasMeasurement[];
}

export async function fetchAtlasReport(): Promise<ServiceReport> {
  const publicKey = process.env.ATLAS_PUBLIC_KEY;
  const privateKey = process.env.ATLAS_PRIVATE_KEY;
  const projectId = process.env.ATLAS_PROJECT_ID;

  if (!publicKey || !privateKey || !projectId) {
    return {
      name: "MongoDB Atlas",
      status: "unknown",
      metrics: [
        { label: "Storage used", value: null, limit: 512, unit: "MB", warningThreshold: 0.75, criticalThreshold: 0.9 },
        { label: "Connections", value: null, limit: 500, warningThreshold: 0.8 },
      ],
      lastChecked: new Date(),
      note: "ATLAS_PUBLIC_KEY / ATLAS_PRIVATE_KEY / ATLAS_PROJECT_ID not set",
    };
  }

  try {
    // Fetch cluster list to get the first cluster name + state
    const clustersRes = await digestFetch(
      `${ATLAS_API}/groups/${projectId}/clusters`,
      publicKey,
      privateKey,
    );

    if (!clustersRes.ok) {
      const body = await clustersRes.text();
      console.error("[atlas] clusters error", clustersRes.status, body);
      return {
        name: "MongoDB Atlas",
        status: "unknown",
        metrics: [],
        lastChecked: new Date(),
        error: `API error ${clustersRes.status}`,
      };
    }

    const clustersData = (await clustersRes.json()) as AtlasClustersResponse;
    const cluster = clustersData.results?.[0];
    console.log(`[atlas] cluster: ${cluster?.name} — ${cluster?.stateName}`);

    if (!cluster) {
      return {
        name: "MongoDB Atlas",
        status: "unknown",
        metrics: [],
        lastChecked: new Date(),
        note: "No clusters found",
      };
    }

    const clusterOk = cluster.stateName === "IDLE";

    // Fetch storage + connection measurements (last 24h, 1-hour granularity)
    const end = new Date().toISOString();
    const start = new Date(Date.now() - 86_400_000).toISOString();
    const measureUrl =
      `${ATLAS_API}/groups/${projectId}/clusters/${cluster.name}/measurements` +
      `?granularity=PT1H&period=P1D&m=DATA_SIZE_TOTAL&m=CONNECTIONS` +
      `&start=${start}&end=${end}`;

    const measureRes = await digestFetch(measureUrl, publicKey, privateKey);
    let storageMB: number | null = null;
    let connections: number | null = null;

    if (measureRes.ok) {
      const measureData = (await measureRes.json()) as AtlasMeasurementsResponse;
      for (const m of measureData.measurements ?? []) {
        const latest = [...m.dataPoints].reverse().find((p) => p.value !== null);
        if (m.name === "DATA_SIZE_TOTAL" && latest?.value !== undefined) {
          storageMB = Math.round((latest.value ?? 0) / (1024 * 1024));
        }
        if (m.name === "CONNECTIONS" && latest?.value !== undefined) {
          connections = latest.value;
        }
      }
      console.log(`[atlas] storage: ${storageMB}MB, connections: ${connections}`);
    } else {
      console.error("[atlas] measurements error", measureRes.status);
    }

    const storagePct = storageMB !== null ? storageMB / 512 : null;
    const overallStatus = !clusterOk
      ? "critical"
      : storagePct !== null && storagePct >= 0.9
        ? "critical"
        : storagePct !== null && storagePct >= 0.75
          ? "warning"
          : "ok";

    return {
      name: "MongoDB Atlas",
      status: overallStatus,
      metrics: [
        {
          label: "Storage used",
          value: storageMB,
          limit: 512,
          unit: "MB",
          warningThreshold: 0.75,
          criticalThreshold: 0.9,
        },
        {
          label: "Connections",
          value: connections,
          limit: 500,
          warningThreshold: 0.8,
        },
      ],
      note: `Cluster: ${cluster.name} — ${cluster.stateName}`,
      lastChecked: new Date(),
    };
  } catch (err) {
    console.error("[atlas] fetch failed", err);
    return {
      name: "MongoDB Atlas",
      status: "unknown",
      metrics: [],
      lastChecked: new Date(),
      error: err instanceof Error ? err.message : "Fetch failed",
    };
  }
}
