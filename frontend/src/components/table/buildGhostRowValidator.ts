/**
 * Ghost-row validator factory – shared ghost-row required-field validation.
 *
 * Each admin table previously carried its own copy of the same
 * "field is required → German error" closure. This factory is the single
 * Source of Truth: callers declare the required fields + labels once.
 */
import type { GhostRowValidator } from './useGhostEditor';

/** A required ghost-row field with its German display label for the error message. */
export interface RequiredGhostField {
  field: string
  label: string
}

/**
 * Builds a ghost-row validator that requires the given fields.
 *
 * Returns the first missing field's German error message, or `null` when all
 * required fields are filled.
 *
 * @param fields Required fields with their German labels.
 * @returns A validator matching the `useGhostEditor` contract.
 */
export function buildGhostRowValidator(
  fields: readonly RequiredGhostField[],
): GhostRowValidator {
  return (data) => {
    const missing = fields.find(({ field }) => !(data[field] ?? '').trim());
    return missing ? `${missing.label} ist ein Pflichtfeld.` : null;
  };
}
