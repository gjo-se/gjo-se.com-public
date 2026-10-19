/**
 * extractApiError – Extrahiert eine lesbare Fehlermeldung aus API-Antworten.
 *
 * Behandelt: Array-detail (Validierung), String-detail, unbekannte Errors.
 */

interface ApiError {
  response?: { data?: { detail?: unknown } }
  message?: string
}

/**
 * Extracts a human-readable error message from an API error response.
 *
 * Handles:
 * - Array detail (validation errors from FastAPI) → joined messages
 * - String detail → returned directly
 * - Unknown error → fallback message
 */
export function extractApiError(e: unknown): string {
  const err = e as ApiError;
  const detail = err?.response?.data?.detail;

  if (Array.isArray(detail)) {
    return detail
      .map((d: { msg?: string }) => d.msg || '')
      .filter(Boolean)
      .join('; ');
  }

  if (typeof detail === 'string') return detail;

  return err?.message ?? 'Fehler beim Speichern';
}
