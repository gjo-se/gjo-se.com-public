/**
 * Service für LLM-Provider (aus llmRegistryService extrahiert, Ticket #315).
 *
 * User-Endpunkte erfordern JWT-Cookie (role user|admin).
 * Admin-Endpunkte erfordern JWT-Cookie (role admin).
 */
import { api } from '@src/lib/api/axios';

export interface LLMProviderAdmin {
  id: number
  name: string
  display_name: string
  api_base: string | null
  created_at: string
}

export interface LLMProviderStatus {
  id: number
  name: string
  display_name: string
  is_supported: boolean
  has_key: boolean
  key_valid: boolean
  key_label: string | null
}

// ── API ─────────────────────────────────────────────────────────────────────

const adminProvidersBase = '/admin/llm/providers';

/** Fetches all LLM providers for the admin panel via GET /admin/llm/providers. */
export async function fetchAdminLLMProviders(): Promise<LLMProviderAdmin[]> {
  const res = await api.get<LLMProviderAdmin[]>(adminProvidersBase);
  return res.data;
}

/** Updates a provider's api_base via PATCH /admin/llm/providers/{id}. */
export async function updateProviderApiBase(
  providerId: number,
  apiBase: string,
): Promise<LLMProviderAdmin> {
  const res = await api.patch<LLMProviderAdmin>(
    `${adminProvidersBase}/${providerId}`,
    { api_base: apiBase || null },
  );
  return res.data;
}

const providersBase = '/user/llm/providers';

/** Fetches supported LLM providers with key status for the authenticated user via GET /user/llm/providers. */
export async function fetchLLMProviders(): Promise<LLMProviderStatus[]> {
  const res = await api.get<LLMProviderStatus[]>(providersBase);
  return res.data;
}
