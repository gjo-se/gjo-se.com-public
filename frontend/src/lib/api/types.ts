/**
 * api/types – Shared API parameter types.
 *
 * Wird von allen Listen-Endpoints (get-*.ts) verwendet.
 */

export interface PaginatedParams {
  offset?: number
  limit?: number
  q?: string
  sort_by?: string
  sort_order?: 'asc' | 'desc'
}
