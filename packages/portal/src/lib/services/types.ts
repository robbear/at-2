export type ServiceStatus = "ok" | "warning" | "critical" | "unknown";

export interface ServiceMetric {
  label: string;
  value: number | null;
  limit: number | null;
  unit?: string;
  /** Fraction of limit at which to show 'warning' (e.g. 0.8 = 80%) */
  warningThreshold?: number;
  /** Fraction of limit at which to show 'critical' (e.g. 0.95 = 95%) */
  criticalThreshold?: number;
}

export interface ServiceReport {
  name: string;
  status: ServiceStatus;
  metrics: ServiceMetric[];
  note?: string;
  lastChecked: Date;
  error?: string;
}
