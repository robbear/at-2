import type { ServiceReport, ServiceStatus } from "./types";

const REPO = "robbear/at-2";

interface WorkflowRun {
  id: number;
  name: string;
  conclusion: "success" | "failure" | "cancelled" | "skipped" | "timed_out" | null;
  status: "completed" | "in_progress" | "queued" | "waiting";
  created_at: string;
  html_url: string;
}

interface WorkflowRunsResponse {
  total_count: number;
  workflow_runs: WorkflowRun[];
}

function runToStatus(run: WorkflowRun): ServiceStatus {
  if (run.status !== "completed") return "warning"; // in progress
  switch (run.conclusion) {
    case "success":
    case "skipped":
      return "ok";
    case "failure":
    case "timed_out":
      return "critical";
    case "cancelled":
      return "unknown";
    default:
      return "unknown";
  }
}

export async function fetchGithubActionsReport(): Promise<ServiceReport> {
  const token = process.env.PORTAL_GITHUB_TOKEN;

  if (!token) {
    return {
      name: "GitHub Actions",
      status: "unknown",
      metrics: [],
      lastChecked: new Date(),
      note: "PORTAL_GITHUB_TOKEN not set",
    };
  }

  let data: WorkflowRunsResponse;
  try {
    const res = await fetch(
      `https://api.github.com/repos/${REPO}/actions/runs?per_page=10`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
        },
        cache: "no-store",
      },
    );

    if (!res.ok) {
      const body = await res.text();
      console.error("[github] API error", res.status, body);
      return {
        name: "GitHub Actions",
        status: "unknown",
        metrics: [],
        lastChecked: new Date(),
        error: `API error ${res.status}`,
      };
    }

    data = (await res.json()) as WorkflowRunsResponse;
  } catch (err) {
    console.error("[github] fetch failed", err);
    return {
      name: "GitHub Actions",
      status: "unknown",
      metrics: [],
      lastChecked: new Date(),
      error: err instanceof Error ? err.message : "Fetch failed",
    };
  }

  const runs = data.workflow_runs ?? [];
  console.log(`[github] fetched ${runs.length} workflow runs`);

  const last = runs[0];
  const overallStatus = last ? runToStatus(last) : "unknown";
  const failureCount = runs.filter(
    (r) => r.conclusion === "failure" || r.conclusion === "timed_out",
  ).length;

  return {
    name: "GitHub Actions",
    status: overallStatus,
    metrics: [
      {
        label: "Failures in last 10 runs",
        value: failureCount,
        limit: 10,
        warningThreshold: 0.1, // 1+ failures = warning
        criticalThreshold: 0.3, // 3+ failures = critical
      },
    ],
    note: last
      ? `Last: ${last.name} — ${last.conclusion ?? last.status} — ${new Date(last.created_at).toLocaleDateString()}`
      : "No runs found",
    lastChecked: new Date(),
  };
}
