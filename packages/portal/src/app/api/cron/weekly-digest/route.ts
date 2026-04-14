import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { fetchMapboxReport } from "@/lib/services/mapbox";
import { fetchGoogleMapsReport } from "@/lib/services/google-maps";
import { fetchVercelReport } from "@/lib/services/vercel-deployments";
import { fetchRailwayReport } from "@/lib/services/railway";
import { fetchAtlasReport } from "@/lib/services/mongodb-atlas";
import { fetchCloudflareR2Report } from "@/lib/services/cloudflare-r2";
import { fetchGithubActionsReport } from "@/lib/services/github-actions";
import { buildWeeklyDigest, sendEmail } from "@/lib/alerts";

export const runtime = "nodejs";

function validateCronSecret(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = request.headers.get("authorization");
  return auth === `Bearer ${secret}`;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  if (!validateCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results = await Promise.allSettled([
    fetchMapboxReport(),
    fetchGoogleMapsReport(),
    fetchVercelReport(),
    fetchRailwayReport(),
    fetchAtlasReport(),
    fetchCloudflareR2Report(),
    fetchGithubActionsReport(),
  ]);

  const reports = results
    .filter((r): r is PromiseFulfilledResult<Awaited<ReturnType<typeof fetchMapboxReport>>> =>
      r.status === "fulfilled",
    )
    .map((r) => r.value);

  const digest = buildWeeklyDigest(reports);
  await sendEmail(digest);

  return NextResponse.json({ sent: true, subject: digest.subject });
}
