/**
 * Tests: careerEntryColumns.validateCareerGhost
 *
 * Requires position and start date, reporting the first missing field with
 * its German label.
 */

import { describe, expect, it } from 'vitest';

import { validateCareerGhost } from '@src/features/application-profile/utils/careerEntryColumns';

describe('validateCareerGhost', () => {
  it('reports the position when it is missing', () => {
    expect(validateCareerGhost({ position: '  ', start_date: '2024-01-01' })).toBe(
      'Position ist ein Pflichtfeld.',
    );
  });

  it('reports the start date when only the position is filled', () => {
    expect(validateCareerGhost({ position: 'Entwickler', start_date: '' })).toBe(
      'Start-Datum ist ein Pflichtfeld.',
    );
  });

  it('accepts a filled position and start date', () => {
    expect(validateCareerGhost({ position: 'Entwickler', start_date: '2024-01-01' })).toBeNull();
  });
});
