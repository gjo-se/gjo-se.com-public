/**
 * Tests: experienceColumns.formatPeriod
 *
 * Covers the MM/YYYY formatting, an open end ("heute") and the fallbacks for
 * unparsable start dates.
 */

import { describe, expect, it } from 'vitest';

import { formatPeriod } from '@src/features/application-profile/utils/experienceColumns';

describe('formatPeriod', () => {
  it('formats a closed period as MM/YYYY – MM/YYYY', () => {
    expect(formatPeriod('2024-03-01', '2024-11-30')).toBe('03/2024 – 11/2024');
  });

  it('renders an open end as heute', () => {
    expect(formatPeriod('2024-03-01', null)).toBe('03/2024 – heute');
  });

  it('renders only the end when the start is unparsable', () => {
    expect(formatPeriod('', '2024-11-30')).toBe('11/2024');
  });

  it('falls back to an em dash without any usable date', () => {
    expect(formatPeriod('', null)).toBe('—');
  });
});
