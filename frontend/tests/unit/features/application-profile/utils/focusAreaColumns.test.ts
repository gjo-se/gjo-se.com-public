/**
 * Tests: focusAreaColumns.validateFocusAreaGhost
 *
 * Requires slug and German title, reporting the first missing field.
 */

import { describe, expect, it } from 'vitest';

import { validateFocusAreaGhost } from '@src/features/application-profile/utils/focusAreaColumns';

describe('validateFocusAreaGhost', () => {
  it('reports the slug when it is missing', () => {
    expect(validateFocusAreaGhost({ slug: '', title_de: 'Architektur' })).toBe(
      'Slug ist ein Pflichtfeld.',
    );
  });

  it('reports the German title when only the slug is filled', () => {
    expect(validateFocusAreaGhost({ slug: 'ai', title_de: '   ' })).toBe(
      'Titel (DE) ist ein Pflichtfeld.',
    );
  });

  it('accepts slug and German title', () => {
    expect(validateFocusAreaGhost({ slug: 'ai', title_de: 'KI' })).toBeNull();
  });
});
