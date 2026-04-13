import type { ServiceReport } from "./types";

const CF_GRAPHQL = "https://api.cloudflare.com/client/v4/graphql";

// R2 free tier limits
const STORAGE_LIMIT_MB = 10_240; // 10 GB
const CLASS_A_LIMIT = 1_000_000;
const CLASS_B_LIMIT = 10_000_000;

const USAGE_QUERY = `
  query R2Usage($accountId: String!, $since: Date!, $until: Date!) {
    viewer {
      accounts(filter: { accountTag: $accountId }) {
        r2OperationsAdaptiveGroups(
          limit: 10000
          filter: { date_geq: $since, date_leq: $until }
        ) {
          sum { requests }
          dimensions { actionType }
        }
        r2StorageAdaptiveGroups(
          limit: 1
          filter: { date_geq: $since, date_leq: $until }
          orderBy: [date_DESC]
        ) {
          max { payloadSize }
        }
      }
    }
  }
`;

interface R2OpsGroup {
  sum: { requests: number };
  dimensions: { actionType: string };
}

interface R2StorageGroup {
  max: { payloadSize: number };
}

interface CFGraphQLResponse {
  data?: {
    viewer?: {
      accounts?: {
        r2OperationsAdaptiveGroups?: R2OpsGroup[];
        r2StorageAdaptiveGroups?: R2StorageGroup[];
      }[];
    };
  };
  errors?: { message: string }[];
}

// Class A actions: writes, lists, deletes
// Class B actions: reads (GetObject, HeadObject, etc.)
const CLASS_A_ACTIONS = /^(CreateBucket|DeleteBucket|DeleteObject|PutObject|CopyObject|CompleteMultipartUpload|CreateMultipartUpload|UploadPart|AbortMultipartUpload|ListBuckets|ListObjects|ListMultipartUploads|ListParts)$/i;

export async function fetchCloudflareR2Report(): Promise<ServiceReport> {
  const apiToken = process.env.CLOUDFLARE_API_TOKEN;
  const accountId = process.env.R2_ACCOUNT_ID;

  if (!apiToken || !accountId) {
    return {
      name: "Cloudflare R2",
      status: "unknown",
      metrics: [
        { label: "Storage used", value: null, limit: STORAGE_LIMIT_MB, unit: "MB", warningThreshold: 0.8, criticalThreshold: 0.95 },
        { label: "Class A ops this month", value: null, limit: CLASS_A_LIMIT, unit: "ops", warningThreshold: 0.8 },
        { label: "Class B ops this month", value: null, limit: CLASS_B_LIMIT, unit: "ops", warningThreshold: 0.8 },
      ],
      lastChecked: new Date(),
      note: "CLOUDFLARE_API_TOKEN not set",
    };
  }

  const now = new Date();
  const since = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  const until = now.toISOString().slice(0, 10);

  let data: CFGraphQLResponse;
  try {
    const res = await fetch(CF_GRAPHQL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: USAGE_QUERY,
        variables: { accountId, since, until },
      }),
      cache: "no-store",
    });

    if (!res.ok) {
      const body = await res.text();
      console.error("[cloudflare-r2] API error", res.status, body);
      return {
        name: "Cloudflare R2",
        status: "unknown",
        metrics: [],
        lastChecked: new Date(),
        error: `API error ${res.status}`,
      };
    }

    data = (await res.json()) as CFGraphQLResponse;
  } catch (err) {
    console.error("[cloudflare-r2] fetch failed", err);
    return {
      name: "Cloudflare R2",
      status: "unknown",
      metrics: [],
      lastChecked: new Date(),
      error: err instanceof Error ? err.message : "Fetch failed",
    };
  }

  if (data.errors?.length) {
    console.error("[cloudflare-r2] GraphQL errors", data.errors);
    return {
      name: "Cloudflare R2",
      status: "unknown",
      metrics: [],
      lastChecked: new Date(),
      error: data.errors[0]?.message ?? "GraphQL error",
    };
  }

  const account = data.data?.viewer?.accounts?.[0];
  const opsGroups = account?.r2OperationsAdaptiveGroups ?? [];
  const storageGroups = account?.r2StorageAdaptiveGroups ?? [];

  let classAOps = 0;
  let classBOps = 0;
  for (const g of opsGroups) {
    if (CLASS_A_ACTIONS.test(g.dimensions.actionType)) {
      classAOps += g.sum.requests;
    } else {
      classBOps += g.sum.requests;
    }
  }

  const payloadBytes = storageGroups[0]?.max.payloadSize ?? null;
  const storageMB = payloadBytes !== null ? Math.round(payloadBytes / (1024 * 1024)) : null;

  console.log(`[cloudflare-r2] storage: ${storageMB}MB, classA: ${classAOps}, classB: ${classBOps}`);

  const storagePct = storageMB !== null ? storageMB / STORAGE_LIMIT_MB : 0;
  const classAPct = classAOps / CLASS_A_LIMIT;
  const classBPct = classBOps / CLASS_B_LIMIT;
  const maxPct = Math.max(storagePct, classAPct, classBPct);

  const status = maxPct >= 0.95 ? "critical" : maxPct >= 0.8 ? "warning" : "ok";

  return {
    name: "Cloudflare R2",
    status,
    metrics: [
      { label: "Storage used", value: storageMB, limit: STORAGE_LIMIT_MB, unit: "MB", warningThreshold: 0.8, criticalThreshold: 0.95 },
      { label: "Class A ops this month", value: classAOps, limit: CLASS_A_LIMIT, unit: "ops", warningThreshold: 0.8 },
      { label: "Class B ops this month", value: classBOps, limit: CLASS_B_LIMIT, unit: "ops", warningThreshold: 0.8 },
    ],
    lastChecked: new Date(),
  };
}
