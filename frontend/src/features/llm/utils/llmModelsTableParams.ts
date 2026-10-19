/**
 * llmModelsTableParams – Static table key, sort-field map and extra URL-param
 * registry for the LLM models table.
 *
 * Pure module (no React/Hook dependency).
 */

import type { TableParamRegistry } from '@src/components/table/useTableUrlState';

/** Table key for the LLM models server-side table. */
export const TABLE_KEY = 'llm-models';

/** Sort field map: frontend key → backend column. */
export const SORT_FIELD_MAP: Record<string, string> = {
  id: 'id',
  displayName: 'display_name',
  priceInput: 'price_input',
};

const parseBool = (raw: string): boolean | null => (raw === '' ? null : raw === 'true');
const parseNullableInt = (raw: string): number | null => (raw ? Number(raw) : null);

/** Extra param registry for the LLM models table. */
export const MODELS_EXTRA_PARAMS: TableParamRegistry = {
  provider_id: {
    default: null,
    parse: parseNullableInt,
    serialize: (v: unknown) => (v == null ? undefined : String(v)),
  },
  supports_structured_output: {
    default: null,
    parse: parseBool,
    serialize: (v: unknown) => (v == null ? undefined : String(v)),
  },
  input_modality: {
    default: null,
    parse: (raw: string) => raw || null,
    serialize: (v: unknown) => (v ? String(v) : undefined),
  },
  output_modality: {
    default: null,
    parse: (raw: string) => raw || null,
    serialize: (v: unknown) => (v ? String(v) : undefined),
  },
  reasoning: {
    default: null,
    parse: parseBool,
    serialize: (v: unknown) => (v == null ? undefined : String(v)),
  },
  is_active: {
    default: null,
    parse: parseBool,
    serialize: (v: unknown) => (v == null ? undefined : String(v)),
  },
  price_min: {
    default: null,
    parse: (raw: string) => (raw ? Number(raw) : null),
    serialize: (v: unknown) => (v == null ? undefined : String(v)),
  },
  price_max: {
    default: null,
    parse: (raw: string) => (raw ? Number(raw) : null),
    serialize: (v: unknown) => (v == null ? undefined : String(v)),
  },
};

/** Parses a boolean dropdown value ('true'/'false'/'' → true/false/null). */
export function parseBoolDropdown(raw: string): boolean | null {
  return raw === 'true' ? true : raw === 'false' ? false : null;
}
