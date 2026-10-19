/**
 * Appends a rolling 52-week average as `trend52w` to each data point.
 * Returns `trend52w: undefined` for all points when data has fewer than 52 entries.
 */

export interface TrendDataPoint {
  /** Sortable key in format YYYY-WXX, e.g. "2026-W17". */
  weekKey: string
  /** Display label for the X-axis, e.g. "KW 17". */
  label: string
  count: number
}

type TrendDataPointWithTrend = TrendDataPoint & { trend52w?: number };

/**
 * Shared utilities for ProjectTrendChart – extracted to satisfy react-refresh/only-export-components.
 */

/** Appends a rolling 52-week average as `trend52w` to each data point. */
export function addTrend52w(data: TrendDataPoint[]): TrendDataPointWithTrend[] {
  if (data.length < 52) return data.map((d) => ({ ...d, trend52w: undefined }));
  return data.map((d, i) => {
    const windowSlice = data.slice(Math.max(0, i - 51), i + 1);
    const avg = windowSlice.reduce((s, w) => s + w.count, 0) / windowSlice.length;
    return { ...d, trend52w: Math.round(avg * 10) / 10 };
  });
}
