/**
 * Tests: proofSubTableColumns.validateGhost
 *
 * The proof ghost row requires a statement.
 */

import { describe, expect, it } from 'vitest';

import { validateGhost as validateProofGhost } from '@src/features/portfolio/utils/proofSubTableColumns';

describe('validateGhost (proof)', () => {
  it('requires the statement', () => {
    expect(validateProofGhost({ statement: '  ' })).toBe('Antwort ist ein Pflichtfeld.');
  });

  it('accepts a filled statement', () => {
    expect(validateProofGhost({ statement: 'Sauber gelöst.' })).toBeNull();
  });
});
