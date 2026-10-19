/**
 * Tests: cn / safeJsonParse – class merging and tolerant JSON parsing.
 *
 * cn must keep project display font sizes while still resolving conflicts;
 * safeJsonParse must never throw and always fall back on invalid input.
 */
import { describe, expect, it } from 'vitest';

import { cn, safeJsonParse } from '@src/lib/utils';

describe('cn', () => {
  it('löst konkurrierende Utility-Klassen zugunsten der letzten auf', () => {
    expect(cn('p-2', 'p-4')).toBe('p-4');
    expect(cn('text-sm', 'text-lg')).toBe('text-lg');
  });

  it('behandelt Display-Font-Sizes nicht als Textfarbe', () => {
    expect(cn('text-on-surface', 'text-display-lg')).toBe('text-on-surface text-display-lg');
  });

  it('ignoriert falsche und leere Eingaben', () => {
    expect(cn('flex', false, null, undefined, '', 'gap-2')).toBe('flex gap-2');
  });
});

describe('safeJsonParse', () => {
  it('parst gültiges JSON', () => {
    expect(safeJsonParse('{"count":2}', {})).toEqual({ count: 2 });
  });

  it('liefert bei ungültigem JSON den Fallback', () => {
    const fallback = { count: 0 };

    expect(safeJsonParse('{kaputt', fallback)).toBe(fallback);
  });

  it('liefert bei leerem String den Fallback', () => {
    expect(safeJsonParse('', [])).toEqual([]);
  });

  it('behält JSON-Primitive bei', () => {
    expect(safeJsonParse('42', 0)).toBe(42);
    expect(safeJsonParse('null', 'fallback')).toBeNull();
  });
});
