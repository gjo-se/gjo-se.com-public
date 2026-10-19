/**
 * Tests: statusChipVariant
 *
 * Equivalence classes over the DB status names: active, inactive/deprecated,
 * rejected and the default for every remaining status.
 */
import { describe, expect, it } from 'vitest';

import { statusChipVariant } from '@src/features/fbf/dedup/utils/boardCard';

describe('statusChipVariant', () => {
  it('mappt active auf success', () => {
    expect(statusChipVariant('active')).toBe('success');
  });

  it('mappt inactive und deprecated auf muted', () => {
    expect(statusChipVariant('inactive')).toBe('muted');
    expect(statusChipVariant('deprecated')).toBe('muted');
  });

  it('mappt rejected auf error', () => {
    expect(statusChipVariant('rejected')).toBe('error');
  });

  it('fällt für pending und unbekannte Status auf info zurück', () => {
    expect(statusChipVariant('pending')).toBe('info');
    expect(statusChipVariant('unknown-status')).toBe('info');
    expect(statusChipVariant('')).toBe('info');
  });
});
