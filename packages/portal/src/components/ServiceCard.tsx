import { clsx } from "clsx";
import type { ServiceReport, ServiceMetric, ServiceStatus } from "@/lib/services/types";

function metricStatus(metric: ServiceMetric): ServiceStatus {
  if (metric.value === null || metric.limit === null) return "unknown";
  const pct = metric.value / metric.limit;
  if (metric.criticalThreshold !== undefined && pct >= metric.criticalThreshold) return "critical";
  if (metric.warningThreshold !== undefined && pct >= metric.warningThreshold) return "warning";
  return "ok";
}

function statusBadge(status: ServiceStatus): { label: string; classes: string } {
  switch (status) {
    case "ok":
      return { label: "OK", classes: "bg-green-100 text-green-700" };
    case "warning":
      return { label: "Warning", classes: "bg-yellow-100 text-yellow-700" };
    case "critical":
      return { label: "Critical", classes: "bg-red-100 text-red-700" };
    default:
      return { label: "Unknown", classes: "bg-slate-100 text-slate-500" };
  }
}

function progressBarColor(status: ServiceStatus): string {
  switch (status) {
    case "ok":
      return "bg-green-500";
    case "warning":
      return "bg-yellow-400";
    case "critical":
      return "bg-red-500";
    default:
      return "bg-slate-300";
  }
}

function cardBorderColor(status: ServiceStatus): string {
  switch (status) {
    case "ok":
      return "border-green-200";
    case "warning":
      return "border-yellow-300";
    case "critical":
      return "border-red-300";
    default:
      return "border-slate-200";
  }
}

function formatValue(value: number, unit?: string): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M${unit ? ` ${unit}` : ""}`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}k${unit ? ` ${unit}` : ""}`;
  return `${value}${unit ? ` ${unit}` : ""}`;
}

interface MetricRowProps {
  metric: ServiceMetric;
}

function MetricRow({ metric }: MetricRowProps): React.ReactNode {
  const status = metricStatus(metric);
  const hasBar = metric.value !== null && metric.limit !== null && metric.limit > 0;
  const pct = hasBar ? Math.min(100, Math.round(((metric.value ?? 0) / (metric.limit ?? 1)) * 100)) : 0;

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="text-slate-600">{metric.label}</span>
        <span className="font-medium text-slate-800 tabular-nums">
          {metric.value === null
            ? "—"
            : `${formatValue(metric.value, metric.unit)}${metric.limit !== null ? ` / ${formatValue(metric.limit, metric.unit)}` : ""}`}
        </span>
      </div>
      {hasBar && (
        <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
          <div
            className={clsx("h-full rounded-full transition-all", progressBarColor(status))}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
      {hasBar && metric.warningThreshold !== undefined && (
        <p className="text-xs text-slate-400 tabular-nums">
          {pct}% used — alert at {Math.round((metric.warningThreshold ?? 0) * 100)}%
        </p>
      )}
    </div>
  );
}

interface ServiceCardProps {
  report: ServiceReport;
}

export function ServiceCard({ report }: ServiceCardProps): React.ReactNode {
  const badge = statusBadge(report.status);
  const borderColor = cardBorderColor(report.status);

  return (
    <div className={clsx("rounded-lg border bg-surface p-5 shadow-sm space-y-4", borderColor)}>
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-slate-900">{report.name}</h2>
        <span className={clsx("rounded-full px-2.5 py-0.5 text-xs font-medium", badge.classes)}>
          {badge.label}
        </span>
      </div>

      {report.error ? (
        <p className="text-sm text-red-600">{report.error}</p>
      ) : (
        <div className="space-y-3">
          {report.metrics.map((metric, i) => (
            <MetricRow key={i} metric={metric} />
          ))}
        </div>
      )}

      <div className="border-t border-slate-100 pt-3 space-y-1">
        {report.note && <p className="text-xs text-slate-400">{report.note}</p>}
        <p className="text-xs text-slate-400">
          Checked {report.lastChecked.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
        </p>
      </div>
    </div>
  );
}
