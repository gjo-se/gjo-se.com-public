/**
 * Tests: getStreamUrl – stream URL and WebP variant keys derived from a master key.
 *
 * The API origin prefix comes from the environment; the assertions therefore
 * target the stable path part and the fully derived variant keys.
 */
import { describe, expect, it } from 'vitest';

import {
  buildWebpKeys,
  getStreamUrl,
  getVariantKey,
  getVariantStreamUrl,
} from '@src/lib/getStreamUrl';

describe('getStreamUrl', () => {
  it('baut die Stream-URL aus dem Storage-Key', () => {
    expect(getStreamUrl('portfolio/hero.png')).toBe('/api/v1/stream/portfolio/hero.png');
  });

  it('behält verschachtelte Key-Pfade unverändert bei', () => {
    expect(getStreamUrl('profiles/2026/avatar.webp')).toBe('/api/v1/stream/profiles/2026/avatar.webp');
  });
});

describe('getVariantKey', () => {
  it('ersetzt die Master-Endung durch ratio und width', () => {
    expect(getVariantKey('portfolio/hero.png', '16-9', '800')).toBe('portfolio/hero.16-9.800.webp');
  });

  it('hängt die Variante auch ohne Dateiendung korrekt an', () => {
    expect(getVariantKey('portfolio/hero', '4-3', '1920')).toBe('portfolio/hero.4-3.1920.webp');
  });
});

describe('buildWebpKeys', () => {
  it('erzeugt alle neun ratio-width-Varianten aus dem Master-Key', () => {
    const keys = buildWebpKeys('portfolio/hero.png');

    expect(keys).toEqual({
      '16-9': {
        '800': 'portfolio/hero.16-9.800.webp',
        '1280': 'portfolio/hero.16-9.1280.webp',
        '1920': 'portfolio/hero.16-9.1920.webp',
      },
      '21-9': {
        '800': 'portfolio/hero.21-9.800.webp',
        '1280': 'portfolio/hero.21-9.1280.webp',
        '1920': 'portfolio/hero.21-9.1920.webp',
      },
      '4-3': {
        '800': 'portfolio/hero.4-3.800.webp',
        '1280': 'portfolio/hero.4-3.1280.webp',
        '1920': 'portfolio/hero.4-3.1920.webp',
      },
    });
  });

  it('liefert ohne Master-Key undefined statt leerer Varianten', () => {
    expect(buildWebpKeys(null)).toBeUndefined();
    expect(buildWebpKeys(undefined)).toBeUndefined();
    expect(buildWebpKeys('')).toBeUndefined();
  });
});

describe('getVariantStreamUrl', () => {
  it('kombiniert Varianten-Key und Stream-Pfad', () => {
    expect(getVariantStreamUrl('portfolio/hero.png', '21-9', '1280')).toBe(
      '/api/v1/stream/portfolio/hero.21-9.1280.webp',
    );
  });
});
