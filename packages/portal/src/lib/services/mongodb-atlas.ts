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
    headers: { Accept: "application/vnd.atlas.2024-11-13+json" },
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
      Accept: "application/vnd.atlas.2024-11-13+json",
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

interface AtlasProcess {
  id: string; // hostname:port
}

interface AtlasProcessesResponse {
  results?: AtlasProcess[];
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
    // Fetch cluster list — check /clusters (dedicated M10+) then /flexClusters.
    // After upgrading from Hobby to Flex, the cluster only appears in /flexClusters.
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
    let cluster = clustersData.results?.[0];

    if (!cluster) {
      // Dedicated clusters endpoint returned nothing — try Flex clusters endpoint.
      const flexRes = await digestFetch(
        `${ATLAS_API}/groups/${projectId}/flexClusters`,
        publicKey,
        privateKey,
      );
      if (flexRes.ok) {
        const flexData = (await flexRes.json()) as AtlasClustersResponse;
        cluster = flexData.results?.[0];
        console.log(`[atlas] flex cluster: ${cluster?.name} — ${cluster?.stateName}`);
      } else {
        console.error("[atlas] flexClusters error", flexRes.status, await flexRes.text());
      }
    }

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

    // Measurements live at the process (host) level, not the cluster level.
    // Fetch process list first, then query measurements on the first process.
    let storageMB: number | null = null;
    let connections: number | null = null;

    const processesRes = await digestFetch(
      `${ATLAS_API}/groups/${projectId}/processes`,
      publicKey,
      privateKey,
    );

    if (!processesRes.ok) {
      console.error("[atlas] processes error", processesRes.status, await processesRes.text());
    } else {
      const processesData = (await processesRes.json()) as AtlasProcessesResponse;
      const process = processesData.results?.[0];
      console.log(`[atlas] process: ${process?.id}`);

      if (process) {
        const end = new Date().toISOString();
        const start = new Date(Date.now() - 86_400_000).toISOString();
        const measureUrl =
          `${ATLAS_API}/groups/${projectId}/processes/${process.id}/measurements` +
          `?granularity=PT1H&m=CONNECTIONS` +
          `&start=${start}&end=${end}`;

        const measureRes = await digestFetch(measureUrl, publicKey, privateKey);
        if (!measureRes.ok) {
          console.error("[atlas] measurements error", measureRes.status, await measureRes.text());
        } else {
          const measureData = (await measureRes.json()) as AtlasMeasurementsResponse;
          for (const m of measureData.measurements ?? []) {
            const latest = [...m.dataPoints].reverse().find((p) => p.value !== null);
            if (m.name === "DB_STORAGE_TOTAL" && latest?.value !== undefined) {
              storageMB = Math.round((latest.value ?? 0) / (1024 * 1024));
            }
            if (m.name === "CONNECTIONS" && latest?.value !== undefined) {
              connections = latest.value;
            }
          }
          console.log(`[atlas] storage: ${storageMB}MB, connections: ${connections}`);
        }
      }
    }

    const overallStatus = !clusterOk ? "critical" : "ok";

    return {
      name: "MongoDB Atlas",
      status: overallStatus,
      metrics: [
        ...(storageMB !== null
          ? [{ label: "Storage used", value: storageMB, limit: 512, unit: "MB", warningThreshold: 0.75, criticalThreshold: 0.9 }]
          : []),
        ...(connections !== null
          ? [{ label: "Connections", value: connections, limit: 500, warningThreshold: 0.8 }]
          : []),
      ],
      note: `Cluster: ${cluster.name} — ${cluster.stateName}${storageMB === null ? " · Per-process metrics not available on Flex/M0" : ""}`,
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
