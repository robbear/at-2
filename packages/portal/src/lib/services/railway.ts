import type { ServiceReport, ServiceStatus } from "./types";

const RAILWAY_GRAPHQL = "https://backboard.railway.app/graphql/v2";

const DEPLOYMENTS_QUERY = `
  query PortalDeployments {
    me {
      projects {
        edges {
          node {
            name
            services {
              edges {
                node {
                  name
                  deployments(first: 5) {
                    edges {
                      node {
                        status
                        createdAt
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
`;

type DeploymentStatus =
  | "SUCCESS"
  | "FAILED"
  | "CRASHED"
  | "BUILDING"
  | "DEPLOYING"
  | "WAITING"
  | "REMOVED"
  | "REMOVING";

interface RailwayDeployment {
  status: DeploymentStatus;
  createdAt: string;
}

interface RailwayService {
  name: string;
  deployments: { edges: { node: RailwayDeployment }[] };
}

interface RailwayProject {
  name: string;
  services: { edges: { node: RailwayService }[] };
}

interface RailwayResponse {
  data?: {
    me?: {
      projects?: { edges: { node: RailwayProject }[] };
    };
  };
  errors?: { message: string }[];
}

function deployStatusToServiceStatus(s: DeploymentStatus): ServiceStatus {
  switch (s) {
    case "SUCCESS":
      return "ok";
    case "FAILED":
    case "CRASHED":
      return "critical";
    case "BUILDING":
    case "DEPLOYING":
    case "WAITING":
      return "warning";
    default:
      return "unknown";
  }
}

export async function fetchRailwayReport(): Promise<ServiceReport> {
  const token = process.env.PORTAL_RAILWAY_API_TOKEN;

  if (!token) {
    return {
      name: "Railway (API)",
      status: "unknown",
      metrics: [],
      lastChecked: new Date(),
      note: "PORTAL_RAILWAY_API_TOKEN not set",
    };
  }

  let data: RailwayResponse;
  try {
    const res = await fetch(RAILWAY_GRAPHQL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query: DEPLOYMENTS_QUERY }),
      cache: "no-store",
    });

    if (!res.ok) {
      const body = await res.text();
      console.error("[railway] API error", res.status, body);
      return {
        name: "Railway (API)",
        status: "unknown",
        metrics: [],
        lastChecked: new Date(),
        error: `API error ${res.status}`,
      };
    }

    data = (await res.json()) as RailwayResponse;
  } catch (err) {
    console.error("[railway] fetch failed", err);
    return {
      name: "Railway (API)",
      status: "unknown",
      metrics: [],
      lastChecked: new Date(),
      error: err instanceof Error ? err.message : "Fetch failed",
    };
  }

  if (data.errors?.length) {
    console.error("[railway] GraphQL errors", data.errors);
    return {
      name: "Railway (API)",
      status: "unknown",
      metrics: [],
      lastChecked: new Date(),
      error: data.errors[0]?.message ?? "GraphQL error",
    };
  }

  const projects = data.data?.me?.projects?.edges ?? [];
  console.log(`[railway] fetched ${projects.length} projects`);

  // Collect all services across projects, find worst status
  const notes: string[] = [];
  let worstStatus: ServiceStatus = "ok";

  for (const { node: project } of projects) {
    for (const { node: service } of project.services.edges) {
      const lastDeploy = service.deployments.edges[0]?.node;
      if (!lastDeploy) continue;

      const s = deployStatusToServiceStatus(lastDeploy.status);
      if (s === "critical") worstStatus = "critical";
      else if (s === "warning" && worstStatus !== "critical") worstStatus = "warning";
      else if (s === "unknown" && worstStatus === "ok") worstStatus = "unknown";

      const date = new Date(lastDeploy.createdAt).toLocaleDateString();
      notes.push(`${project.name}/${service.name}: ${lastDeploy.status} (${date})`);
    }
  }

  if (notes.length === 0) {
    return {
      name: "Railway (API)",
      status: "unknown",
      metrics: [],
      lastChecked: new Date(),
      note: "No services found",
    };
  }

  return {
    name: "Railway (API)",
    status: worstStatus,
    metrics: [],
    note: notes.join(" · "),
    lastChecked: new Date(),
  };
}
