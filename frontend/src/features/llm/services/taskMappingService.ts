/**
 * Service für LLM Task Mappings.
 *
 * Admin-Endpunkte erfordern JWT-Cookie (role admin).
 */
import { api } from '@src/lib/api/axios';

/** Prompt-Platzhalter aus der Task-Registry. */
interface Placeholder {
  key: string
  label: string
  description: string
  category: string
}

/** Aktuelles Mapping eines Tasks auf Modell + Credential. */
interface TaskMappingResponse {
  id: number | null
  model_id: number | null
  model_display_name: string | null
  credential_id: number | null
  credential_label: string | null
  credential_portal: string | null
  credential_provider: string | null
  active: boolean
  status: string | null
  status_color_token: string | null
}

/** Payload für das Erstellen/Aktualisieren eines Task-Mappings. */
export interface TaskMappingUpsert {
  model_id: number | null
  credential_id: number | null
  active: boolean
}

/** Task aus der Registry mit optionalem Mapping. */
export interface TaskWithMapping {
  key: string
  display_name: string
  description: string
  allowed_triggers: string[]
  placeholders: Placeholder[]
  mapping: TaskMappingResponse | null
  active_prompt_version: number | null
}
// ── Types ───────────────────────────────────────────────────────────────────

const tasksBase = '/admin/llm/tasks';
const mappingsBase = '/admin/llm/task-mappings';

/** Lädt alle Tasks mit ihren aktuellen Mappings via GET /admin/llm/tasks. */
export async function fetchTasks(): Promise<TaskWithMapping[]> {
  const res = await api.get<TaskWithMapping[]>(tasksBase);
  return res.data;
}

/** Toggled das active-Flag eines Task-Mappings via PATCH /admin/llm/task-mappings/{task}/active. */
export async function setTaskMappingActive(
  task: string,
  active: boolean,
): Promise<TaskWithMapping> {
  const res = await api.patch<TaskWithMapping>(
    `${mappingsBase}/${task}/active`,
    { active },
  );
  return res.data;
}

/** Erstellt oder aktualisiert das Mapping eines Tasks via PUT /admin/llm/task-mappings/{task}. */
export async function upsertTaskMapping(
  task: string,
  data: TaskMappingUpsert,
): Promise<TaskWithMapping> {
  const res = await api.put<TaskWithMapping>(
    `${mappingsBase}/${task}`,
    data,
  );
  return res.data;
}
