/**
 * tableParamRegistry – generische Registry-Helfer für Tabellen-URL-Parameter.
 *
 * Kapselt das Parsen/Serialisieren/Initialisieren der zusätzlichen,
 * tabellenspezifischen Parameter (`TableParamSpec`). Getrennt von der
 * URL-/localStorage-Synchronisation (`useTableUrlState`); die Spezifikations-
 * Typen bleiben am Verbraucher (`useTableUrlState`) und werden nur als Typ
 * importiert.
 */

import type { TableExtraParams, TableParamRegistry, TableParamSpec } from './useTableUrlState';

/** Builds the default extra-param object from a registry (each param's default). */
export function defaultExtra(registry: TableParamRegistry): TableExtraParams {
  const extra: TableExtraParams = {};
  Object.entries(registry).forEach(([name, spec]) => { extra[name] = spec.default; });
  return extra;
}

/** Parses a raw URL string into the typed registry value, falling back to the default. */
export function parseParam(spec: TableParamSpec, raw: string | null): unknown {
  if (raw === null) return spec.default;
  return spec.parse ? spec.parse(raw) : raw;
}

/** Restores only managed extra params from a localStorage record (no foreign params like `tab`). */
export function restoreExtra(record: Record<string, string>, registry: TableParamRegistry): TableExtraParams {
  const extra: TableExtraParams = {};
  Object.entries(registry).forEach(([name, spec]) => {
    extra[name] = parseParam(spec, record[name] ?? null);
  });
  return extra;
}

/** Serializes a registry value to a URL string, or undefined when it equals the default. */
export function serializeParam(spec: TableParamSpec, value: unknown): string | undefined {
  const toRaw = (input: unknown): string | undefined => {
    if (spec.serialize) return spec.serialize(input);
    return input === undefined || input === null ? undefined : String(input);
  };
  const raw = toRaw(value);
  const defaultRaw = toRaw(spec.default);
  if (raw === undefined || raw === '' || raw === defaultRaw) return undefined;
  return raw;
}
