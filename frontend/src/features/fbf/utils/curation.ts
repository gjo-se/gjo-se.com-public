import { showErrorToast } from '@src/lib/errorToast';

/** Minimal row shape required by :func:`confirmRows`. */
interface ConfirmableRow {
  id: number
  active: boolean
}

/**
 * Confirms all not-yet-active rows for the standard "Bestätigen" bulk action.
 *
 * Args:
 *   rows: Selected table rows.
 *   confirm: API call confirming the given ids.
 *   errorMessage: Toast message on failure.
 *
 * Returns:
 *   ``true`` when at least one row was confirmed, ``false`` otherwise.
 */
export async function confirmRows<Row extends ConfirmableRow>(
  rows: Row[],
  confirm: (ids: number[]) => Promise<unknown>,
  errorMessage: string,
): Promise<boolean> {
  const ids = rows.filter((r) => !r.active).map((r) => r.id);
  if (ids.length === 0) return false;
  try {
    await confirm(ids);
    return true;
  } catch {
    showErrorToast(errorMessage);
    return false;
  }
}

/**
 * Extracts the ghost-row name from raw create data.
 *
 * Args:
 *   data: Column-key → value map coming from the ghost row.
 *
 * Returns:
 *   The trimmed name.
 *
 * Raises:
 *   Error: When the name is empty.
 */
export function requireGhostName(data: Record<string, unknown>): string {
  const name = String(data.name ?? '').trim();
  if (!name) throw new Error('Name ist erforderlich.');
  return name;
}
