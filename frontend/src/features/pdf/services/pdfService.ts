/**
 * PDF API-Service – typisierte API-Funktionen für die PDF-Generierung.
 *
 * Alle Admin-Endpunkte erfordern ein gültiges JWT-Cookie mit role='admin'.
 * Nutzt den gemeinsamen `apiFetch`-Helper (siehe `@src/lib/api/apiFetch`).
 */
import { apiFetch } from '@src/lib/api/apiFetch';

// ── Constants ─────────────────────────────────────────────────────────────────

const BASE = '/api/v1';

// ── Request Types ─────────────────────────────────────────────────────────────

export interface PdfGenerateRequest {
  template_name: string;
  data: Record<string, unknown>;
}

// ── Service Functions ─────────────────────────────────────────────────────────

/** POST /api/v1/admin/pdf/generate – Generate PDF from template + data, returns Blob. */
export function generatePdf(
  templateName: string,
  data: Record<string, unknown>,
): Promise<Blob> {
  return apiFetch<Blob>(`${BASE}/admin/pdf/generate`, {
    method: 'POST',
    body: { template_name: templateName, data } satisfies PdfGenerateRequest,
    parse: 'blob',
  });
}
