/**
 * Tests: STATUS_OPTIONS
 *
 * The toolbar options are the contract with the server-side status filter:
 * an empty value means "all", every other option must be a real DB status
 * name that the label mirrors.
 */
import { describe, expect, it } from 'vitest';

import { STATUS_OPTIONS } from '@src/features/fbf/dedup/utils/columnToolbar';

describe('STATUS_OPTIONS', () => {
  it('beginnt mit dem Leerwert für "all"', () => {
    expect(STATUS_OPTIONS[0]).toEqual({ value: '', label: 'all' });
  });

  it('deckt genau die fünf Kurations-Status ab', () => {
    expect(STATUS_OPTIONS.map((option) => option.value)).toEqual([
      '',
      'pending',
      'active',
      'inactive',
      'rejected',
      'deprecated',
    ]);
  });

  it('spiegelt den DB-Status im Label', () => {
    const statusOptions = STATUS_OPTIONS.slice(1);

    expect(statusOptions.every((option) => option.label === option.value)).toBe(true);
  });

  it('enthält keine doppelten Werte', () => {
    const values = STATUS_OPTIONS.map((option) => option.value);

    expect(new Set(values).size).toBe(values.length);
  });
});
