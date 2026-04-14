import type { ReactNode } from "react";
import { ServiceCard } from "@/components/ServiceCard";
import { fetchMapboxReport } from "@/lib/services/mapbox";
import { fetchGoogleMapsReport } from "@/lib/services/google-maps";
import { fetchVercelReport } from "@/lib/services/vercel-deployments";
import { fetchRailwayReport } from "@/lib/services/railway";
import { fetchAtlasReport } from "@/lib/services/mongodb-atlas";
import { fetchCloudflareR2Report } from "@/lib/services/cloudflare-r2";
import { fetchGithubActionsReport } from "@/lib/services/github-actions";
import { fetchPostHogReport } from "@/lib/services/posthog";
import type { ServiceReport } from "@/lib/services/types";

// Regenerate this page at most every 5 minutes
export const revalidate = 300;

function settledToReport(
  result: PromiseSettledResult<ServiceReport>,
  fallbackName: string,
): ServiceReport {
  if (result.status === "fulfilled") return result.value;
  return {
    name: fallbackName,
    status: "unknown",
    metrics: [],
    lastChecked: new Date(),
    error: result.reason instanceof Error ? result.reason.message : "Fetch failed",
  };
}

export default async function DashboardPage(): Promise<ReactNode> {
  const results = await Promise.allSettled([
    fetchMapboxReport(),
    fetchGoogleMapsReport(),
    fetchVercelReport(),
    fetchRailwayReport(),
    fetchAtlasReport(),
    fetchCloudflareR2Report(),
    fetchGithubActionsReport(),
    fetchPostHogReport(),
  ]);

  const [mapbox, googleMaps, vercel, railway, atlas, cloudflare, github, posthog] = [
    settledToReport(results[0]!, "Mapbox"),
    settledToReport(results[1]!, "Google Maps"),
    settledToReport(results[2]!, "Vercel"),
    settledToReport(results[3]!, "Railway (API)"),
    settledToReport(results[4]!, "MongoDB Atlas"),
    settledToReport(results[5]!, "Cloudflare R2"),
    settledToReport(results[6]!, "GitHub Actions"),
    settledToReport(results[7]!, "PostHog"),
  ];

  const allReports = [mapbox, googleMaps, vercel, railway, atlas, cloudflare, github, posthog];
  const criticalCount = allReports.filter((r) => r.status === "critical").length;
  const warningCount = allReports.filter((r) => r.status === "warning").length;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
      <header className="space-y-1">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold text-slate-900">Atlasphere Dashboard</h1>
          {criticalCount > 0 && (
            <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700">
              {criticalCount} critical
            </span>
          )}
          {warningCount > 0 && (
            <span className="rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-700">
              {warningCount} warning
            </span>
          )}
        </div>
        <p className="text-sm text-slate-500">
          Resource usage and status across all Atlasphere services. Refreshes every 5 minutes.
        </p>
      </header>

      <section>
        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-3">
          Map Providers
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <ServiceCard report={mapbox} />
          <ServiceCard report={googleMaps} />
        </div>
      </section>

      <section>
        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-3">
          Hosting &amp; Infrastructure
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <ServiceCard report={vercel} />
          <ServiceCard report={railway} />
        </div>
      </section>

      <section>
        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-3">
          Data &amp; Storage
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <ServiceCard report={atlas} />
          <ServiceCard report={cloudflare} />
        </div>
      </section>

      <section>
        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-3">
          Analytics
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <ServiceCard report={posthog} />
        </div>
      </section>

      <section>
        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-3">
          CI/CD
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <ServiceCard report={github} />
        </div>
      </section>

      <footer className="border-t border-slate-200 pt-4">
        <p className="text-xs text-slate-400">
          Data cached for up to 5 minutes. Reload the page to force a refresh.
        </p>
      </footer>
    </div>
  );
}
