/**
 * Tests: technologyIconUrl
 *
 * Verifies the deterministic storage-key convention for technology icons:
 * catalog prefix, slug encoding, variant suffix, and the empty-slug boundary.
 */

import { describe, expect, it } from 'vitest';

import { technologyIconUrl } from '@src/features/viscera/viewer/utils/technologyIconUrl';

const PREFIX = '/api/v1/public/technology-catalog/icons/stream/technology-catalog';

describe('technologyIconUrl', () => {
  it('baut die Stream-URL aus Slug und Dark-Variante', () => {
    expect(technologyIconUrl('python', 'dark')).toBe(`${PREFIX}/python_dark.svg`);
  });

  it('nutzt die Light-Variante im Dateinamen', () => {
    expect(technologyIconUrl('python', 'light')).toBe(`${PREFIX}/python_light.svg`);
  });

  it('enkodiert Sonderzeichen im Slug', () => {
    expect(technologyIconUrl('c++', 'dark')).toBe(`${PREFIX}/c%2B%2B_dark.svg`);
  });

  it('liefert bei leerem Slug nur die Varianten-Datei', () => {
    expect(technologyIconUrl('', 'light')).toBe(`${PREFIX}/_light.svg`);
  });
});
