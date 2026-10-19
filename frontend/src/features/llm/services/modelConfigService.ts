/**
 * Service für LLM Model Configs (unified pool – replaces TaskMapping + EvalConfig).
 *
 * Admin-Endpunkte erfordern JWT-Cookie (role admin).
 *
 * Abhängigkeit: #977 (BE: ModelConfigService + /model-config/* Endpunkte).
 */
import { api } from '@src/lib/api/axios';

// ── Types ───────────────────────────────────────────────────────────────────

export interface ModelConfigCreate {
  model_id: number
  credential_id?: number | null
  hyperparameters?: Record<string, unknown> | null
  is_production?: boolean
  is_fallback?: boolean
  is_eval?: boolean
}

export interface ModelConfigRow {
  id: number
  task: string
  model_id: number
  model_display_name: string | null
  credential_id: number | null
  credential_label: string | null
  provider_name: string | null
  hyperparameters: Record<string, unknown> | null
  is_production: boolean
  is_fallback: boolean
  is_eval: boolean
  status: string | null
  status_color_token: string | null
  created_at: string
  updated_at: string
}

export interface ModelConfigUpdate {
  model_id?: number
  credential_id?: number | null
  hyperparameters?: Record<string, unknown> | null
  is_production?: boolean
  is_fallback?: boolean
  is_eval?: boolean
}

// ── API ─────────────────────────────────────────────────────────────────────

const base = '/admin/llm/model-config';

/** Erstellt eine neue Model-Config via POST /model-config/{task}. */
export async function createModelConfig(
  taskKey: string,
  data: ModelConfigCreate,
): Promise<ModelConfigRow> {
  const res = await api.post<ModelConfigRow>(`${base}/${taskKey}`, data);
  return res.data;
}

/** Löscht eine Model-Config via DELETE /model-config/{id}. */
export async function deleteModelConfig(id: number): Promise<void> {
  await api.delete(`${base}/${id}`);
}

/** Lädt alle Model-Configs für einen Task via GET /model-config/{task}. */
export async function fetchModelConfigs(taskKey: string): Promise<ModelConfigRow[]> {
  const res = await api.get<ModelConfigRow[]>(`${base}/${taskKey}`);
  return res.data;
}

/** Aktualisiert eine Model-Config partiell via PATCH /model-config/{id}. */
export async function updateModelConfig(
  id: number,
  data: ModelConfigUpdate,
): Promise<ModelConfigRow> {
  const res = await api.patch<ModelConfigRow>(`${base}/${id}`, data);
  return res.data;
}
