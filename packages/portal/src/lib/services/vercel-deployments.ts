import type { ServiceReport, ServiceStatus } from "./types";

interface VercelDeployment {
  uid: string;
  name: string;
  state: "BUILDING" | "ERROR" | "INITIALIZING" | "QUEUED" | "READY" | "CANCELED";
  createdAt: number;
}

interface VercelDeploymentsResponse {
  deployments: VercelDeployment[];
}

function deploymentStateToStatus(state: VercelDeployment["state"]): ServiceStatus {
  switch (state) {
    case "READY":
      return "ok";
    case "ERROR":
      return "critical";
    case "BUILDING":
    case "INITIALIZING":
    case "QUEUED":
      return "warning";
    default:
      return "unknown";
  }
}

export async function fetchVercelReport(): Promise<ServiceReport> {
  const token = process.env.PORTAL_VERCEL_API_TOKEN;

  if (!token) {
    return {
      name: "Vercel",
      status: "unknown",
      metrics: [],
      lastChecked: new Date(),
      note: "PORTAL_VERCEL_API_TOKEN not set",
    };
  }

  let data: VercelDeploymentsResponse;
  try {
    const res = await fetch("https://api.vercel.com/v6/deployments?limit=10", {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });

    if (!res.ok) {
      const body = await res.text();
      console.error("[vercel] API error", res.status, body);
      return {
        name: "Vercel",
        status: "unknown",
        metrics: [],
        lastChecked: new Date(),
        error: `API error ${res.status}`,
      };
    }

    data = (await res.json()) as VercelDeploymentsResponse;
  } catch (err) {
    console.error("[vercel] fetch failed", err);
    return {
      name: "Vercel",
      status: "unknown",
      metrics: [],
      lastChecked: new Date(),
      error: err instanceof Error ? err.message : "Fetch failed",
    };
  }

  const deployments = data.deployments ?? [];
  console.log(`[vercel] fetched ${deployments.length} deployments`);

  const last = deployments[0];
  const overallStatus = last ? deploymentStateToStatus(last.state) : "unknown";
  const errorCount = deployments.filter((d) => d.state === "ERROR").length;

  return {
    name: "Vercel",
    status: overallStatus,
    metrics: [
      {
        label: "Errors in last 10 deploys",
        value: errorCount,
        limit: 10,
        warningThreshold: 0.1, // 1+ errors = warning
        criticalThreshold: 0.3, // 3+ errors = critical
      },
    ],
    note: last
      ? `Last: ${last.name} — ${last.state} — ${new Date(last.createdAt).toLocaleDateString()}`
      : "No deployments found",
    lastChecked: new Date(),
  };
}
