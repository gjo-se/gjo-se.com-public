/**
 * projectFormatters – shared display helpers for normalised Project fields.
 *
 * Used by list views, detail views and any future use cases that render
 * Project data. Keeps presentation logic in one place instead of duplicating
 * it across pages.
 */

/** German display labels for contract_type enum values stored in the DB. */
const contractTypeDe: Record<string, string> = {
  contracting: 'Freelancer',
  employee_leasing: 'Arbeitnehmerüberlassung',
  permanent_position: 'Festanstellung',
};

/**
 * Returns a localised label for a contract_type value.
 * Falls back to the raw value if not found in the mapping.
 */
export function formatContractType(value: string | null | undefined): string {
  if (!value) return '–';
  return contractTypeDe[value] ?? value;
}

/**
 * Normalises "M/YYYY" to "MM/YYYY" for consistent display.
 * Example: "5/2026" → "05/2026".
 * Returns "–" when the month is `0` or `00` (i.e. no valid start date).
 */
export function formatDuration(value: string | null | undefined): string {
  if (!value) return '–';
  return `${value} Mon.`;
}

/**
 * Formats a duration string (months as text) for display.
 * Example: "6" → "6 Mon."
 */
export function formatStartDate(value: string | null | undefined): string {
  if (!value) return '–';
  const parts = value.split('/');
  if (parts.length === 2) {
    const month = parts[0];
    if (month === '0' || month === '00') return '–';
    return `${month.padStart(2, '0')}/${parts[1]}`;
  }
  return value;
}

/** Returns true if the given ISO date string is older than 30 days. */
export function isLowRemote(value: number | null | undefined): boolean {
  return value != null && value < 80;
}

/** Returns true if remote_percent is below 80 (on-site-heavy). */
export function isOlderThan30Days(dateStr: string | null | undefined): boolean {
  if (!dateStr) return false;
  return (Date.now() - new Date(dateStr).getTime()) / 86_400_000 > 30;
}

/**
 * Returns true if contract_type signals an employment contract rather than
 * freelance contracting (employee_leasing or permanent_position).
 */
export function isRedContractType(value: string | null | undefined): boolean {
  return value === 'employee_leasing' || value === 'permanent_position';
}
