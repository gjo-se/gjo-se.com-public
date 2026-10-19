/**
 * Tests: colorTokens – token palette identity, meta consistency and dot fallback.
 *
 * Contract: every ColorToken resolves to a Tailwind dot class, the canonical
 * label/hex vocabulary matches the CSS map, and unknown values fall back to gray.
 */
import { describe, expect, it } from 'vitest';

import { COLOR_TOKEN_CSS, COLOR_TOKEN_META, getColorBg } from '@src/lib/colorTokens';

describe('getColorBg', () => {
  it('liefert die feste Hintergrundklasse für einen bekannten Token', () => {
    expect(getColorBg('red')).toBe('bg-tag-red');
    expect(getColorBg('green')).toBe('bg-tag-green');
  });

  it('fällt bei unbekanntem Token auf den grauen Punkt zurück', () => {
    expect(getColorBg('does-not-exist')).toBe('bg-tag-gray');
    expect(getColorBg('')).toBe('bg-tag-gray');
  });
});

describe('COLOR_TOKEN_META', () => {
  it('beschreibt jeden CSS-Token mit exakt demselben Hex-Wert', () => {
    for (const token of Object.keys(COLOR_TOKEN_CSS) as (keyof typeof COLOR_TOKEN_CSS)[]) {
      expect(COLOR_TOKEN_META[token].hex).toBe(COLOR_TOKEN_CSS[token].hex);
    }
  });

  it('ordnet jedem Token ein eindeutiges Familien-Label zu', () => {
    const labels = Object.values(COLOR_TOKEN_META).map((meta) => meta.label);

    expect(new Set(labels).size).toBe(labels.length);
  });

  it('deckt dieselbe Token-Menge ab wie die CSS-Map', () => {
    expect(Object.keys(COLOR_TOKEN_META).sort()).toEqual(Object.keys(COLOR_TOKEN_CSS).sort());
  });

  it('liefert für den roten Token die Familie rust mit Hex-Wert', () => {
    expect(COLOR_TOKEN_META.red).toEqual({ label: 'rust', hex: '#B0553F' });
  });
});
