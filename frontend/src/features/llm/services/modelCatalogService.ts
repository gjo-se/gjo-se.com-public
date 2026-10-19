/**
 * Service für LLM-Modell-Katalog.
 *
 * Server-side paginated model list + count (Increment 4/5).
 * Admin-Endpunkte erfordern JWT-Cookie (role admin).
 */
import { api } from '@src/lib/api/axios';

export interface LLMModelEntry {
  id: number
  openrouter_id: string
  native_model_id: string
  provider_id: number
  provider_name: string
  provider_display_name: string
  display_name: string
  description: string | null
  context_window: number | null
  active: boolean
  status: string | null
  status_color_token: string | null
  current_price_input: string | null
  current_price_output: string | null
  first_seen_at: string
  last_seen_at: string
  supported_parameters: unknown[] | null
  architecture: Record<string, unknown> | null
  reasoning: Record<string, unknown> | null
  default_parameters: Record<string, unknown> | null
  top_provider: Record<string, unknown> | null
  max_completion_tokens: number | null
  knowledge_cutoff: string | null
  hugging_face_id: string | null
  created: number | null
  canonical_slug: string | null
  is_locally_installed: boolean
  task_type: string
  task_tags: string | null
  provider_installed: boolean
}

export interface LLMModelListParams {
  provider_id?: number | null
  q?: string | null
  supports_structured_output?: boolean | null
  modality?: string | null
  input_modality?: string | null
  output_modality?: string | null
  reasoning?: boolean | null
  is_active?: boolean | null
  price_min?: number | null
  price_max?: number | null
  sort_by?: string | null
  sort_order?: string | null
  offset?: number
  limit?: number
}

export interface LLMSyncResult {
  providers_upserted: number
  models_upserted: number
  snapshots_created: number
}

const adminModelsBase = '/admin/llm/models';

/**
 * Builds the shared filter query (provider, text, modality, price).
 *
 * Covered by both list and count endpoints; sorting/pagination are added by
 * the caller.
 */
function buildModelFilterQuery(params: LLMModelListParams): Record<string, string> {
  const query: Record<string, string> = {};
  if (params.provider_id != null) query.provider_id = String(params.provider_id);
  if (params.q) query.q = params.q;
  if (params.supports_structured_output != null) {
    query.supports_structured_output = String(params.supports_structured_output);
  }
  if (params.modality) query.modality = params.modality;
  if (params.input_modality) query.input_modality = params.input_modality;
  if (params.output_modality) query.output_modality = params.output_modality;
  if (params.reasoning != null) query.reasoning = String(params.reasoning);
  if (params.is_active != null) query.is_active = String(params.is_active);
  if (params.price_min != null) query.price_min = String(params.price_min);
  if (params.price_max != null) query.price_max = String(params.price_max);
  return query;
}

// ── API ─────────────────────────────────────────────────────────────────────

/** Fetch a single model by ID via GET /admin/llm/models/{id}. */
export async function fetchModelById(id: number): Promise<LLMModelEntry> {
  const res = await api.get<LLMModelEntry>(`${adminModelsBase}/${id}`);
  return res.data;
}

/** Fetch model count matching filters via GET /admin/llm/models/count. */
export async function fetchModelCount(params: LLMModelListParams): Promise<number> {
  const query = buildModelFilterQuery(params);

  const res = await api.get<{ total: number }>(`${adminModelsBase}/count`, { params: query });
  return res.data.total;
}

/** Fetch paginated model list via GET /admin/llm/models (server-side). */
export async function fetchModels(params: LLMModelListParams): Promise<LLMModelEntry[]> {
  const query = buildModelFilterQuery(params);
  if (params.sort_by) query.sort_by = params.sort_by;
  if (params.sort_order) query.sort_order = params.sort_order;
  if (params.offset != null) query.offset = String(params.offset);
  if (params.limit != null) query.limit = String(params.limit);

  const res = await api.get<LLMModelEntry[]>(adminModelsBase, { params: query });
  return res.data;
}

/** Toggles the active status of a single LLM model via PATCH /admin/llm/models/{id}. */
export async function patchLLMModelActive(
  modelId: number,
  active: boolean,
): Promise<LLMModelEntry> {
  const res = await api.patch<LLMModelEntry>(`${adminModelsBase}/${modelId}`, { active });
  return res.data;
}

/** Triggers a full sync of LLM models from OpenRouter via POST /admin/llm/models/sync. */
export async function syncLLMModels(): Promise<LLMSyncResult> {
  const res = await api.post<LLMSyncResult>(`${adminModelsBase}/sync`);
  return res.data;
}
