/**
 * Tests: portfolioAdminTableColumns.validateGhost
 *
 * The portfolio ghost row requires a slug.
 */

import { describe, expect, it } from 'vitest';

import { validateGhost as validatePortfolioGhost } from '@src/features/portfolio/utils/portfolioAdminTableColumns';

describe('validateGhost (portfolio)', () => {
  it('requires the slug', () => {
    expect(validatePortfolioGhost({ slug: '   ' })).toBe('Slug ist ein Pflichtfeld.');
  });

  it('accepts a filled slug', () => {
    expect(validatePortfolioGhost({ slug: 'ai' })).toBeNull();
  });
});
