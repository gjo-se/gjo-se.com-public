/**
 * Service für das zentrale LLM-Call-Log (Fehler-Dashboard).
 *
 * Admin-Endpunkte erfordern JWT-Cookie (role admin).
 */
import { api } from '@src/lib/api/axios';

/** Admin-Sicht auf eine einzelne ``llm_call_log``-Zeile. */
export interface CallLogOut {
  id: number
  task: string
  phase: string | null
  project_id: number | null
  trigger: string | null
  call_type: string
  success: boolean | null
  error_type: string | null
  error_message: string | null
  resolved_model: string | null
  resolved_credential: string | null
  duration_ms: number | null
  prompt_tokens: number | null
  completion_tokens: number | null
  total_tokens: number | null
  created_at: string
  input_snapshot: Record<string, unknown> | null
  retry_of_id: number | null
  retry_count: number
  retry_status: string | null
  output_snapshot: string | null
  promoted_at: string | null
  promoted_to: string | null
  dataset_item_id: string | null
}

/** Paginierte Antwort vom Backend mit items + total. */
export interface CallLogPaginatedResponse {
  items: CallLogOut[]
  total: number
}

/** Aggregation der Call-Log-Zeilen für die Statistik-Kacheln. */
export interface CallLogStats {
  total: number
  success: number
  errors: number
  by_error_type: Record<string, number>
}

/** Filter- und Paginierungsparameter für die Call-Log-Liste. */
export interface FetchCallLogsParams {
  limit?: number
  offset?: number
  q?: string
  sort_by?: string
  sort_order?: 'asc' | 'desc'
  error_type?: string
  task?: string
  only_errors?: boolean
  retry_status?: string
  promoted?: string
}

/** Standardisierte Fehlerklassifikation eines LLM-Calls (SSOT, spiegelt Backend-Enum). */
export type LlmCallErrorType =
  | 'no_mapping'
  | 'model_disabled'
  | 'no_credential'
  | 'credential_invalid'
  | 'no_prompt'
  | 'prompt_variable_missing'
  | 'provider_error'
  | 'rate_limit'
  | 'validation_error'
  | 'unknown';

/** LangSmith-Observability-Konfiguration für den Dashboard-Link. */
export interface ObservabilityConfig {
  enabled: boolean
  project: string
  url: string
}

const callLogsBase = '/admin/llm/call-logs';

export interface ObserverTicketResolveResponse {
  id: number
  ticket_type: string
  severity: string
  task: string
  status: string
  created_at: string
  resolved_at: string | null
  suggested_failure_candidates: SuggestedFailureCandidate[]
}

export interface PromotedStatusResponse {
  call_log_id: number
  promoted_to: 'golden' | 'failure' | null
}

export interface PromoteToDatasetResponse {
  status: 'created' | 'duplicate' | 'rejected'
  message: string
  dataset_item_id: string | null
  duplicate_call_log_id: number | null
  validation_errors: string[]
}

/** Antwort auf einen erfolgreich enqueued Batch-Retry-Job. */
export interface RetryBatchResponse {
  job_id: string
  queued_count: number
}

export interface SuggestedFailureCandidate {
  call_log_id: number
  task: string
  error_type: string | null
  success: boolean | null
  duration_ms: number | null
  created_at: string
}

/** Fortschrittsinformation eines Batch-Jobs (via GET /tasks/{id}/progress). */
export interface TaskProgressResponse {
  status: string
  progress: number | null
  total: number | null
  failed?: number
  error: string | null
}

/** Lädt eine paginierte, gefilterte Liste der Call-Logs (neueste zuerst). */
export async function fetchCallLogs(params: FetchCallLogsParams = {}): Promise<CallLogPaginatedResponse> {
  const query: Record<string, unknown> = {};
  if (params.limit != null) query.limit = params.limit;
  if (params.offset != null) query.offset = params.offset;
  if (params.q) query.q = params.q;
  if (params.sort_by) query.sort_by = params.sort_by;
  if (params.sort_order) query.sort_order = params.sort_order;
  if (params.error_type) query.error_type = params.error_type;
  if (params.task) query.task = params.task;
  if (params.only_errors) query.only_errors = params.only_errors;
  if (params.retry_status) query.retry_status = params.retry_status;
  if (params.promoted) query.promoted = params.promoted;
  const res = await api.get<CallLogPaginatedResponse>(callLogsBase, { params: query });
  return res.data;
}

/** Lädt die aggregierte Call-Log-Statistik, optional ab einem Zeitpunkt (ISO 8601). */
export async function fetchCallLogStats(since?: string): Promise<CallLogStats> {
  const params: Record<string, unknown> = {};
  if (since) params.since = since;
  const res = await api.get<CallLogStats>(`${callLogsBase}/stats`, { params });
  return res.data;
}

// ── Promote to dataset ───────────────────────────────────────

/** Lädt die LangSmith-Observability-Konfiguration via GET /admin/llm/observability. */
export async function fetchObservabilityConfig(): Promise<ObservabilityConfig> {
  const res = await api.get<ObservabilityConfig>('/admin/llm/observability');
  return res.data;
}

/**
 *
 */
export async function fetchPromotedStatus(
  callLogId: number,
): Promise<PromotedStatusResponse> {
  const res = await api.get<PromotedStatusResponse>(
    `${callLogsBase}/${callLogId}/promoted-status`,
  );
  return res.data;
}

/** Pollt den Fortschritt eines Batch-Jobs via arq Job-ID. */
export async function getTaskProgress(taskId: string): Promise<TaskProgressResponse> {
  const res = await api.get<TaskProgressResponse>(`/tasks/${taskId}/progress`);
  return res.data;
}

/**
 *
 */
export async function promoteToDataset(
  callLogId: number,
  label: 'golden' | 'failure',
): Promise<PromoteToDatasetResponse> {
  const res = await api.post<PromoteToDatasetResponse>(
    `${callLogsBase}/${callLogId}/promote-to-dataset`,
    { label },
  );
  return res.data;
}

/**
 *
 */
export async function resolveTicket(
  ticketId: number,
): Promise<ObserverTicketResolveResponse> {
  const res = await api.patch<ObserverTicketResolveResponse>(
    `/admin/llm/observer/tickets/${ticketId}`,
    { status: 'resolved' },
  );
  return res.data;
}

// ── Observer ticket resolve ──────────────────────────────────

/** Wiederholt einen fehlgeschlagenen LLM-Call mit seinem originalen Input-Snapshot. */
export async function retryCallLog(id: number): Promise<CallLogOut> {
  const res = await api.post<CallLogOut>(`${callLogsBase}/${id}/retry`);
  return res.data;
}

/** Enqueued einen Batch-Retry für mehrere fehlgeschlagene Call-Logs. */
export async function retryCallLogBatch(ids: number[]): Promise<RetryBatchResponse> {
  const res = await api.post<RetryBatchResponse>(`${callLogsBase}/retry-batch`, { ids });
  return res.data;
}

/**
 *
 */
export async function unpromoteFromDataset(
  callLogId: number,
): Promise<PromoteToDatasetResponse> {
  const res = await api.delete<PromoteToDatasetResponse>(
    `${callLogsBase}/${callLogId}/promote-to-dataset`,
  );
  return res.data;
}
