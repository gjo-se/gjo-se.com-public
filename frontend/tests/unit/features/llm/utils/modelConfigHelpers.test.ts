/**
 * Tests: modelConfigHelpers – pure helpers for the model-config table.
 *
 * Each helper is exercised at its equivalence classes and boundaries
 * (null/empty/zero, standard vs. exotic params, numeric vs. string fields) plus
 * the invalid-JSON/non-numeric error paths.
 */
import { describe, expect, it } from 'vitest';

import {
  EM_DASH,
  STANDARD_HP_KEYS,
  TABLE_KEY_BASE,
  excludeStandardParams,
  extractErrorMessage,
  extractParam,
  getBreakerVariant,
  mergeHyperparameters,
} from '@src/features/llm/utils/modelConfigHelpers';

describe('extractErrorMessage', () => {
  it('prefers the API detail over the generic message', () => {
    const err = { response: { data: { detail: 'Modell exists' } }, message: 'Request failed' };

    expect(extractErrorMessage(err, 'Fallback')).toBe('Modell exists');
  });

  it('falls back to the error message when no API detail exists', () => {
    expect(extractErrorMessage(new Error('Network down'), 'Fallback')).toBe('Network down');
  });

  it('uses the fallback for unknown values', () => {
    expect(extractErrorMessage(null, 'Fallback')).toBe('Fallback');
    expect(extractErrorMessage({}, 'Fallback')).toBe('Fallback');
  });
});

describe('excludeStandardParams', () => {
  it('returns null when there are no hyperparameters', () => {
    expect(excludeStandardParams(null)).toBeNull();
  });

  it('returns null when only inline-managed keys remain', () => {
    expect(excludeStandardParams({ temperature: 0.5, max_tokens: 100 })).toBeNull();
  });

  it('keeps exotic parameters and drops the standard ones', () => {
    expect(excludeStandardParams({ temperature: 0.5, seed: 7, reasoning: 'low' })).toEqual({ seed: 7 });
  });

  it('exposes the inline-managed key set and table key base', () => {
    expect(STANDARD_HP_KEYS).toEqual(new Set(['temperature', 'max_tokens', 'top_p', 'reasoning']));
    expect(TABLE_KEY_BASE).toBe('admin-llm-model-config-');
    expect(EM_DASH).toBe('\u2013');
  });
});

describe('extractParam', () => {
  it('prefers a hyperparameter value over the model default', () => {
    expect(extractParam({ temperature: 0.2 }, 'temperature', { temperature: 0.9 })).toBe('0.2');
  });

  it('falls back to the model default when the hyperparameter is absent', () => {
    expect(extractParam({}, 'temperature', { temperature: 0.9 })).toBe('0.9');
  });

  it('returns an empty string when neither source has the key', () => {
    expect(extractParam(null, 'top_p', null)).toBe('');
  });

  it('treats a zero hyperparameter as a real value', () => {
    expect(extractParam({ temperature: 0 }, 'temperature', { temperature: 0.9 })).toBe('0');
  });
});

describe('getBreakerVariant', () => {
  it('maps closed to success and open to destructive', () => {
    expect(getBreakerVariant('CLOSED')).toBe('success');
    expect(getBreakerVariant('OPEN')).toBe('destructive');
  });

  it('maps half-open and unknown states to warning', () => {
    expect(getBreakerVariant('HALF_OPEN')).toBe('warning');
    expect(getBreakerVariant('OTHER')).toBe('warning');
  });
});

describe('mergeHyperparameters', () => {
  it('removes the field when the new value is empty', () => {
    expect(mergeHyperparameters({ temperature: 0.4, seed: 1 }, 'temperature', '')).toEqual({ seed: 1 });
  });

  it('stores reasoning as a string value', () => {
    expect(mergeHyperparameters(null, 'reasoning', 'medium')).toEqual({ reasoning: 'medium' });
  });

  it('stores numeric fields as numbers', () => {
    expect(mergeHyperparameters({ seed: 1 }, 'temperature', '0.25')).toEqual({ seed: 1, temperature: 0.25 });
  });

  it('removes the field when the value is not numeric', () => {
    expect(mergeHyperparameters({ temperature: 0.4 }, 'temperature', 'warm')).toEqual({});
  });

  it('does not mutate the existing hyperparameters object', () => {
    const existing = { temperature: 0.4 };

    const merged = mergeHyperparameters(existing, 'max_tokens', '100');

    expect(existing).toEqual({ temperature: 0.4 });
    expect(merged).toEqual({ temperature: 0.4, max_tokens: 100 });
  });
});
