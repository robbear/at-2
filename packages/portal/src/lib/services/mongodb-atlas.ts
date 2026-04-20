import type { ServiceReport } from "./types";
import { digestFetch, ATLAS_API } from "./atlas-api";
import { fetchDbStats } from "./mongodb-stats";
import { fetchAtlasBilling } from "./atlas-billing";

interface AtlasCluster {
  name: string;
  stateName: string;
}

interface AtlasClustersResponse {
  results?: AtlasCluster[];
}

async function fetchCluster(
  projectId: string,
  publicKey: string,
  privateKey: string,
): Promise<AtlasCluster | null> {
  // Check dedicated clusters (M10+) first, then Flex clusters.
  const res = await digestFetch(
    `${ATLAS_API}/groups/${projectId}/clusters`,
    publicKey,
    privateKey,
  );
  if (!res.ok) {
    console.error("[atlas] clusters error", res.status, await res.text());
    return null;
  }
  const data = (await res.json()) as AtlasClustersResponse;
  if (data.results?.[0]) return data.results[0];

  // Flex clusters appear under a separate endpoint.
  const flexRes = await digestFetch(
    `${ATLAS_API}/groups/${projectId}/flexClusters`,
    publicKey,
    privateKey,
  );
  if (!flexRes.ok) {
    console.error("[atlas] flexClusters error", flexRes.status, await flexRes.text());
    return null;
  }
  const flexData = (await flexRes.json()) as AtlasClustersResponse;
  return flexData.results?.[0] ?? null;
}

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function formatBillingMonth(isoEndDate: string): string {
  // endDate is the first day of the next month; subtract one day to get the billing month.
  const d = new Date(new Date(isoEndDate).getTime() - 86_400_000);
  return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

export async function fetchAtlasReport(): Promise<ServiceReport> {
  const publicKey = process.env.ATLAS_PUBLIC_KEY;
  const privateKey = process.env.ATLAS_PRIVATE_KEY;
  const projectId = process.env.ATLAS_PROJECT_ID;

  if (!publicKey || !privateKey || !projectId) {
    return {
      name: "MongoDB Atlas",
      status: "unknown",
      metrics: [],
      lastChecked: new Date(),
      note: "ATLAS_PUBLIC_KEY / ATLAS_PRIVATE_KEY / ATLAS_PROJECT_ID not set",
    };
  }

  try {
    const [cluster, dbStats, billing] = await Promise.all([
      fetchCluster(projectId, publicKey, privateKey),
      fetchDbStats(),
      fetchAtlasBilling(),
    ]);

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

    // Build note: billing info + cluster identity
    const noteParts: string[] = [];
    if (billing) {
      let billingNote = `Cost MTD: ${formatCents(billing.pendingAmountCents)}`;
      if (billing.lastInvoiceTotalCents !== undefined && billing.lastInvoiceEndDate) {
        billingNote += ` · Last month (${formatBillingMonth(billing.lastInvoiceEndDate)}): ${formatCents(billing.lastInvoiceTotalCents)}`;
      }
      noteParts.push(billingNote);
    }
    noteParts.push(`${cluster.name} — ${cluster.stateName} · Flex tier`);

    return {
      name: "MongoDB Atlas",
      status: clusterOk ? "ok" : "critical",
      metrics: [
        ...(dbStats
          ? [
              { label: "Markers", value: dbStats.markerCount, limit: null },
              { label: "Profiles", value: dbStats.profileCount, limit: null },
              { label: "Storage", value: dbStats.storageMB, limit: null, unit: "MB" },
            ]
          : []),
      ],
      note: noteParts.join(" · "),
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
