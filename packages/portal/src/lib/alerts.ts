import type { ServiceReport, ServiceStatus } from "./services/types";

interface AlertPayload {
  subject: string;
  text: string;
}

function metricWorstStatus(report: ServiceReport): ServiceStatus {
  if (report.status === "critical") return "critical";
  if (report.status === "warning") return "warning";
  if (report.error) return "critical";
  return report.status;
}

export function buildThresholdAlert(reports: ServiceReport[]): AlertPayload | null {
  const critical = reports.filter((r) => metricWorstStatus(r) === "critical");
  const warning = reports.filter((r) => metricWorstStatus(r) === "warning");

  if (critical.length === 0 && warning.length === 0) return null;

  const lines: string[] = ["Atlasphere Dashboard — Threshold Alert\n"];

  if (critical.length > 0) {
    lines.push("CRITICAL:");
    for (const r of critical) {
      lines.push(`  ${r.name}: ${r.note ?? r.error ?? "threshold exceeded"}`);
    }
    lines.push("");
  }

  if (warning.length > 0) {
    lines.push("WARNING:");
    for (const r of warning) {
      lines.push(`  ${r.name}: ${r.note ?? "approaching threshold"}`);
    }
    lines.push("");
  }

  lines.push(`Checked at ${new Date().toUTCString()}`);

  const topStatus = critical.length > 0 ? "CRITICAL" : "WARNING";
  return {
    subject: `[${topStatus}] Atlasphere resource threshold alert`,
    text: lines.join("\n"),
  };
}

export function buildWeeklyDigest(reports: ServiceReport[]): AlertPayload {
  const lines: string[] = ["Atlasphere Dashboard — Weekly Digest\n"];

  for (const r of reports) {
    lines.push(`${r.name} [${r.status.toUpperCase()}]`);
    for (const m of r.metrics) {
      if (m.value !== null && m.limit !== null) {
        const pct = Math.round((m.value / m.limit) * 100);
        lines.push(`  ${m.label}: ${m.value} / ${m.limit} (${pct}%)`);
      } else {
        lines.push(`  ${m.label}: unknown`);
      }
    }
    if (r.note) lines.push(`  Note: ${r.note}`);
    lines.push("");
  }

  lines.push(`Generated at ${new Date().toUTCString()}`);

  return {
    subject: "Atlasphere weekly resource digest",
    text: lines.join("\n"),
  };
}

export async function sendEmail(payload: AlertPayload): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  const to = process.env.PORTAL_ALERT_EMAIL;

  if (!apiKey || !to) {
    console.warn("[alerts] RESEND_API_KEY or PORTAL_ALERT_EMAIL not set — skipping email");
    return;
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      from: from ?? "noreply@mail.atlasphere.app",
      to,
      subject: payload.subject,
      text: payload.text,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    console.error("[alerts] Resend error", res.status, body);
  }
}
