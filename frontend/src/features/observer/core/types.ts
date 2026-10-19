/** Observer-Ticket response type – matches backend ObserverTicketResponse schema. */

export interface ObserverMetrics {
  tasks: TaskMetric[];
  timeline: TimelinePoint[];
}

/** Metrics response – matches backend ObserverMetricsResponse schema. */

export interface ObserverTicket {
  id: number;
  ticket_type: string;
  severity: string;
  task: string;
  anomaly_details: Record<string, unknown> | null;
  diagnosis: string | null;
  langfuse_trace_url: string | null;
  status: string;
  created_at: string;
  resolved_at: string | null;
}

export interface TaskMetric {
  name: string;
  p50_ms: number | null;
  p95_ms: number | null;
  p99_ms: number | null;
  error_rate: number;
  ticket_count: number;
}

export interface TimelinePoint {
  ts: string;
  task: string;
  p50_ms: number | null;
  p95_ms: number | null;
  p99_ms: number | null;
}
