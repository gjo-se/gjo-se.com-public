/**
 * Tests: addTrend52w – rolling 52-week average per data point.
 *
 * Fixes the window semantics: short series stay undefined, full series use a
 * trailing 52-point window rounded to one decimal.
 */
import { describe, expect, it } from 'vitest';

import { addTrend52w } from '@src/utils/projectTrendUtils';

import type { TrendDataPoint } from '@src/utils/projectTrendUtils';

/**
 * Builds a series with the given counts and consecutive week keys.
 *
 * @param counts - Weekly counts.
 * @returns Data points in chronological order.
 */
function series(counts: number[]): TrendDataPoint[] {
  return counts.map((count, index) => ({
    weekKey: `2025-W${String(index + 1).padStart(2, '0')}`,
    label: `KW ${index + 1}`,
    count,
  }));
}

describe('addTrend52w', () => {
  it('lässt kurze Serien ohne Trendwert', () => {
    const result = addTrend52w(series([1, 2, 3]));

    expect(result.map((point) => point.trend52w)).toEqual([undefined, undefined, undefined]);
  });

  it('lässt eine Serie mit genau 51 Einträgen ohne Trendwert', () => {
    const result = addTrend52w(series(Array.from({ length: 51 }, () => 1)));

    expect(result.every((point) => point.trend52w === undefined)).toBe(true);
  });

  it('bildet bei 52 Einträgen den Durchschnitt der gesamten Serie', () => {
    const result = addTrend52w(series(Array.from({ length: 52 }, (_, index) => index + 1)));

    expect(result[0].trend52w).toBe(1);
    expect(result[51].trend52w).toBe(26.5);
  });

  it('rollt das Fenster bei mehr als 52 Einträgen weiter', () => {
    const result = addTrend52w(series(Array.from({ length: 53 }, (_, index) => index + 1)));

    expect(result[51].trend52w).toBe(26.5);
    expect(result[52].trend52w).toBe(27.5);
  });

  it('behält die Original-Datenpunkte bei', () => {
    const input = series(Array.from({ length: 52 }, () => 2));

    const result = addTrend52w(input);

    expect(result[0]).toMatchObject({ weekKey: '2025-W01', label: 'KW 1', count: 2 });
    expect(input[0]).not.toHaveProperty('trend52w');
  });
});
