/**
 * Tests: llmModelsTableParams – table key, sort map and URL-param registry.
 *
 * Covers the parse/serialize contract of every registered filter: empty
 * strings become null, "0" stays a real value (boundary), and null/undefined
 * serialize to an omitted param.
 */
import { describe, expect, it } from 'vitest';

import {
  MODELS_EXTRA_PARAMS,
  SORT_FIELD_MAP,
  TABLE_KEY,
  parseBoolDropdown,
} from '@src/features/llm/utils/llmModelsTableParams';

describe('parseBoolDropdown', () => {
  it('maps the "true" and "false" dropdown values to booleans', () => {
    expect(parseBoolDropdown('true')).toBe(true);
    expect(parseBoolDropdown('false')).toBe(false);
  });

  it('maps empty and unknown dropdown values to null', () => {
    expect(parseBoolDropdown('')).toBeNull();
    expect(parseBoolDropdown('TRUE')).toBeNull();
    expect(parseBoolDropdown('1')).toBeNull();
  });
});

describe('llm models table registry', () => {
  it('exposes the stable table key and sort-field map', () => {
    expect(TABLE_KEY).toBe('llm-models');
    expect(SORT_FIELD_MAP).toEqual({
      id: 'id',
      displayName: 'display_name',
      priceInput: 'price_input',
    });
  });

  it('parses numeric provider ids and keeps zero as a value', () => {
    const spec = MODELS_EXTRA_PARAMS.provider_id;

    expect(spec.parse?.('12')).toBe(12);
    expect(spec.parse?.('0')).toBe(0);
    expect(spec.parse?.('')).toBeNull();
  });

  it('parses boolean filters and rejects arbitrary strings', () => {
    const spec = MODELS_EXTRA_PARAMS.supports_structured_output;

    expect(spec.parse?.('true')).toBe(true);
    expect(spec.parse?.('false')).toBe(false);
    expect(spec.parse?.('')).toBeNull();
    expect(spec.parse?.('yes')).toBe(false);
  });

  it('parses modality filters as strings or null', () => {
    expect(MODELS_EXTRA_PARAMS.input_modality.parse?.('text')).toBe('text');
    expect(MODELS_EXTRA_PARAMS.input_modality.parse?.('')).toBeNull();
    expect(MODELS_EXTRA_PARAMS.output_modality.parse?.('image')).toBe('image');
  });

  it('parses price bounds and preserves a zero lower bound', () => {
    expect(MODELS_EXTRA_PARAMS.price_min.parse?.('0')).toBe(0);
    expect(MODELS_EXTRA_PARAMS.price_min.parse?.('2.5')).toBe(2.5);
    expect(MODELS_EXTRA_PARAMS.price_min.parse?.('')).toBeNull();
    expect(MODELS_EXTRA_PARAMS.price_max.parse?.('10')).toBe(10);
  });

  it('serializes null and undefined values to an omitted param', () => {
    Object.values(MODELS_EXTRA_PARAMS).forEach((spec) => {
      expect(spec.serialize?.(null)).toBeUndefined();
      expect(spec.serialize?.(undefined)).toBeUndefined();
    });
  });

  it('serializes concrete values to strings', () => {
    expect(MODELS_EXTRA_PARAMS.provider_id.serialize?.(3)).toBe('3');
    expect(MODELS_EXTRA_PARAMS.is_active.serialize?.(false)).toBe('false');
    expect(MODELS_EXTRA_PARAMS.input_modality.serialize?.('text')).toBe('text');
    expect(MODELS_EXTRA_PARAMS.price_min.serialize?.(0)).toBe('0');
  });
});
