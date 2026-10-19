/**
 * modelConfigHelpers – Pure helpers for the unified LLM model config table.
 *
 * Hyperparameter extraction/merging, error-message extraction and circuit-breaker
 * chip mapping – framework-free, no React/Hook dependency.
 */

/** Base table key for the unified model config table (per task). */
export const TABLE_KEY_BASE = 'admin-llm-model-config-';

/** Em-dash placeholder for empty values. */
export const EM_DASH = '\u2013';

/** Extract a user-facing message from a caught error (Axios or generic). */
export function extractErrorMessage(err: unknown, fallback: string): string {
  const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
  return detail ?? (err as { message?: string })?.message ?? fallback;
}

/** Hyperparameter keys managed via dedicated inline columns (not in the advanced JSON field). */
export const STANDARD_HP_KEYS = new Set(['temperature', 'max_tokens', 'top_p', 'reasoning']);

/** Strip inline-managed keys from hyperparameters, returning only exotic/advanced params. */
export function excludeStandardParams(
  hyperparameters: Record<string, unknown> | null,
): Record<string, unknown> | null {
  if (!hyperparameters) return null;
  const exotic: Record<string, unknown> = {};
  Object.entries(hyperparameters).forEach(([key, value]) => {
    if (!STANDARD_HP_KEYS.has(key)) exotic[key] = value;
  });
  return Object.keys(exotic).length > 0 ? exotic : null;
}

/** Extract a hyperparameter value, falling back to model defaults. */
export function extractParam(
  hyperparameters: Record<string, unknown> | null,
  key: string,
  defaults: Record<string, unknown> | null,
): string {
  const hpVal = hyperparameters?.[key];
  if (hpVal != null) return String(hpVal);
  const defVal = defaults?.[key];
  if (defVal != null) return String(defVal);
  return '';
}

/** Map circuit breaker state to Chip variant. */
export function getBreakerVariant(state: string): 'success' | 'destructive' | 'warning' {
  if (state === 'CLOSED') return 'success';
  if (state === 'OPEN') return 'destructive';
  return 'warning';
}

/** Merge inline hyperparameter fields back into the hyperparameters JSON. */
export function mergeHyperparameters(
  existing: Record<string, unknown> | null,
  field: string,
  value: string,
): Record<string, unknown> {
  const merged = { ...(existing ?? {}) };
  if (value === '') {
    delete merged[field];
    return merged;
  }
  // String-valued fields (e.g. reasoning: "off"|"low"|"medium"|"high").
  const STRING_HP_FIELDS = new Set(['reasoning']);
  if (STRING_HP_FIELDS.has(field)) {
    merged[field] = value;
    return merged;
  }
  const num = Number(value);
  if (Number.isNaN(num)) {
    delete merged[field];
  } else {
    merged[field] = num;
  }
  return merged;
}
