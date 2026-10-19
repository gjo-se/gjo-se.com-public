/**
 * API-Service für den LLM Circuit Breaker (INC 4 / Ticket #891).
 */
import { api } from '@src/lib/api/axios';

/** Response nach einem manuellen Reset. */
export interface CircuitBreakerReset {
  provider_key: string
  state: string
  failure_count: number
}

/** Circuit-Breaker-Status eines einzelnen Provider-Keys. */
export interface CircuitBreakerStatus {
  provider_key: string
  state: 'CLOSED' | 'OPEN' | 'HALF_OPEN'
  failure_count: number
  opened_at: string | null
  last_probe_at: string | null
  threshold: number
  cooldown_seconds: number
}

const BASE = '/admin/llm/circuit-breaker';

/** Alle Circuit-Breaker-Status abrufen. */
export async function fetchCircuitBreakers(): Promise<CircuitBreakerStatus[]> {
  const { data } = await api.get<CircuitBreakerStatus[]>(BASE);
  return data;
}

/** Einen Circuit Breaker manuell zurücksetzen. */
export async function resetCircuitBreaker(providerKey: string): Promise<CircuitBreakerReset> {
  const { data } = await api.post<CircuitBreakerReset>(`${BASE}/${encodeURIComponent(providerKey)}/reset`);
  return data;
}
