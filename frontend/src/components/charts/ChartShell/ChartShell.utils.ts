import type { EChartsOption } from 'echarts';

export const colors = [
  'var(--color-chart-1)',
  'var(--color-chart-2)',
  'var(--color-chart-3)',
  'var(--color-chart-4)',
  'var(--color-chart-5)',
  'var(--color-chart-6)',
  'var(--color-chart-7)',
  'var(--color-chart-8)',
] as const;

export const axisStyle = {
  fontSize: 11,
  fill: 'var(--color-on-surface-muted)',
} as const;
export const axisStyleMuted = {
  fontSize: 10,
  fill: 'var(--color-chart-tick-muted)',
} as const;
export const gridStroke = 'var(--color-chart-grid)';
export const chartHeight = 220;

/** Resolved app font family – echarts canvas needs a concrete font string, not CSS vars. */
export function getChartFontFamily(): string {
  if (typeof document === 'undefined') return 'sans-serif';
  return getComputedStyle(document.body).fontFamily || 'sans-serif';
}

/** Resolved mono font family – for axis labels / ticks (SciChart tech signal). */
export function getChartMonoFontFamily(): string {
  if (typeof document === 'undefined') return 'monospace';
  const v = getComputedStyle(document.documentElement)
    .getPropertyValue('--font-mono')
    .trim();
  return v || 'monospace';
}

/** Reads a CSS custom property value from the document root. Returns hex fallback if SSR or missing. */
function readCSSVar(name: string, fallback: string): string {
  if (typeof document === 'undefined') return fallback;
  const value = getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
  return value || fallback;
}

/**
 * Fallback hex values for the S1 series (canonical english family + hex),
 * matching the light-theme CSS variables in index.css. Used for SSR + when the
 * CSS custom property is missing. Chart index → canonical family:
 *   1 copper #C97A4A · 2 gold #E0A458 · 3 olive #9B7E46 · 4 sage  #7FA98E
 *   5 mauve #A98BA8 · 6 rust  #B0553F · 7 slate #7A8CA0 · 8 gray  #6B6B63
 *
 * Distinguishability rule (Finding 3, rule 4):
 * - Series order is fixed (1→8); assignment to data always in this order
 * - Close pairs (1 #C97A4A vs. 6 #B0553F, and 7 #7A8CA0 vs. 8 #6B6B63) must NOT
 *   appear as adjacent series in the same chart without stepping – use
 *   lightness/opacity variants (fillOpacity ladder 0.10/0.25/0.40) if needed
 * - Radar charts: max. 2–3 series, fillOpacity stepping mandatory
 *   (currently 0.10 importance / 0.25 level)
 */
const CHART_COLOR_FALLBACKS = [
  '#C97A4A',
  '#E0A458',
  '#9B7E46',
  '#7FA98E',
  '#A98BA8',
  '#B0553F',
  '#7A8CA0',
  '#6B6B63',
] as const;

/**
 * Resolved series color for canvas contexts (echarts cannot use `var()` strings).
 *
 * @param index - Series index 1..8 (the fixed S1 series order). Values outside the
 *   range are clamped; missing CSS tokens fall back to the S1 hex palette.
 */
export function getChartColor(index: number): string {
  const clamped = Math.min(Math.max(index, 1), CHART_COLOR_FALLBACKS.length);
  const fallback = CHART_COLOR_FALLBACKS[clamped - 1];
  return readCSSVar(`--color-chart-${clamped}`, fallback);
}

/** Builds an ECharts theme object that reads --color-chart-* CSS variables at call time. */
export function getEchartsTheme(): Record<string, unknown> {
  const palette = CHART_COLOR_FALLBACKS.map((fb, i) =>
    readCSSVar(`--color-chart-${i + 1}`, fb),
  );
  const gridColor = readCSSVar('--color-chart-grid', '#E8E3D9');

  return {
    color: palette,
    backgroundColor: 'transparent',
    textStyle: {
      fontFamily: 'inherit',
      color: readCSSVar('--color-on-surface-muted', '#6b7280'),
    },
    legend: {
      textStyle: {
        color: readCSSVar('--color-on-surface-secondary', '#374151'),
      },
    },
    tooltip: {
      backgroundColor: readCSSVar('--color-surface-container', '#ffffff'),
      borderColor: readCSSVar('--color-border', '#E5E7EB'),
      padding: [6, 10],
      textStyle: {
        color: readCSSVar('--color-on-surface', '#111827'),
        fontSize: 12,
      },
      extraCssText: 'border-radius: 8px; box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);',
    },
    grid: {
      borderColor: gridColor,
    },
    radar: {
      splitLine: { lineStyle: { color: gridColor, width: 0.5, type: 'dashed' } },
      axisLine: { lineStyle: { color: gridColor, width: 0.5 } },
      splitArea: {
        show: true,
        areaStyle: { color: [withAlpha(gridColor, 0.35), 'transparent'] },
      },
    },
  };
}

/**
 * Appends an alpha channel to a canvas-compatible color string.
 *
 * Supports the two color formats that reach echarts in this project: oklch tokens
 * (resolved from CSS custom properties) and hex fallbacks. Alpha in [0, 1].
 */
export function withAlpha(color: string, alpha: number): string {
  const a = Math.min(Math.max(alpha, 0), 1);
  if (color.startsWith('oklch(') && color.endsWith(')')) {
    return `${color.slice(0, -1)} / ${a})`;
  }
  if (color.startsWith('#')) {
    const hex = color.slice(1);
    const full = hex.length === 3 ? hex.split('').map((c) => c + c).join('') : hex;
    if (full.length === 6) {
      const r = parseInt(full.slice(0, 2), 16);
      const g = parseInt(full.slice(2, 4), 16);
      const b = parseInt(full.slice(4, 6), 16);
      return `rgba(${r}, ${g}, ${b}, ${a})`;
    }
  }
  return color;
}

/**
 * Shared echarts option defaults applied to every chart.
 * Consumers spread this into their option objects.
 */
export const BASE_ECHARTS_OPTION: EChartsOption = {
  grid: { top: 8, right: 24, bottom: 0, left: 0 },
  animation: true,
  animationDuration: 300,
};

/** Minimal radar-skill field subset – consumers pass any object carrying these fields. */
export interface RadarDataSkill {
  name: string;
  importance?: number | null;
  level_public?: number | null;
}

/**
 * Builds an echarts option for cartesian (x/y axis) charts.
 *
 * @param data        - Row data objects (e.g. [{ month: 'Jan', value: 100 }, …]).
 * @param xDataKey    - Key in data objects for the X axis.
 * @param series      - ECharts series config (type: 'line' | 'bar').
 * @param gridColor   - Resolved hex color for grid lines.
 * @param labelColor  - Resolved hex color for axis tick labels.
 * @returns A complete `EChartsOption` ready for ChartShell's `option` prop.
 */
export function buildCartesianOption(
  data: Record<string, unknown>[],
  xDataKey: string,
  series: EChartsOption['series'],
  gridColor: string,
  labelColor: string,
): EChartsOption {
  const axisLabel = { color: labelColor, fontSize: 11 };
  const splitLine = {
    lineStyle: { color: gridColor, type: 'dashed' as const },
  };

  return {
    xAxis: {
      type: 'category',
      data: data.map((d) => d[xDataKey] as string | number),
      axisLabel,
      splitLine: { show: false },
    },
    yAxis: {
      type: 'value',
      axisLabel,
      splitLine,
    },
    grid: { top: 8, right: 24, bottom: 0, left: 0 },
    tooltip: { trigger: 'axis' },
    animation: true,
    animationDuration: 300,
    series,
  };
}

/** Resolved axis label color – echarts canvas needs hex values, not CSS vars. */
export function getAxisLabelColor(): string {
  return readCSSVar('--color-on-surface-muted', '#6b7280');
}

/** Resolved grid stroke color – echarts canvas needs hex values, not CSS vars. */
export function getGridStrokeColor(): string {
  return readCSSVar('--color-chart-grid', '#E8E3D9');
}

/** Resolved muted axis label color – for radar axis names (quiet, mono). */
export function getMutedAxisLabelColor(): string {
  return readCSSVar('--color-on-surface-muted', '#6b7280');
}

/** Resolved primary accent – tooltip border / axis pointer. */
export function getPrimaryColor(): string {
  return readCSSVar('--color-primary', '#C97A4A');
}

/**
 * Radar-Farb-Semantik – EINZIGE zentrale Quelle (keine konkurrierenden Varianten).
 * Abgestimmt auf Look-Master `radar-look-v6`:
 * - Referenz (Importance / Markt) = Salbei `#7FA98E` (chart-4) – ruhige, dünne gestrichelte Kontur.
 * - Heldin  (Level / Ist)         = Kupfer  `#C97A4A` (chart-1) – präsenter Ring, dezente Fläche.
 * Aufrufer nutzen NUR diese Funktionen – nie getChartColor-Indexe direkt für die Radar-Spuren.
 */
export function getRadarColorImportance(): string {
  return getChartColor(4);
}

/** Heldin-Farbe (Level/Ist) – Kupfer, siehe getRadarColorImportance. */
export function getRadarColorLevel(): string {
  return getChartColor(1);
}

/** Public-Level-Spur – Mauve (chart-5), klar abgesetzt von Kupfer (Level) und Salbei (Importance). */
export function getRadarColorLevelPublic(): string {
  return getChartColor(5);
}

/** Resolved strong axis label color – higher contrast than the muted default. */
export function getStrongAxisLabelColor(): string {
  return readCSSVar('--color-on-surface-secondary', '#374151');
}

/** Resolved surface background – used as the "fill" of ring data points. */
export function getSurfaceColor(): string {
  return readCSSVar('--color-surface', '#ffffff');
}

/**
 * Radar-compatible data (RadarChart expects `subject` + numeric keys).
 *
 * Shared by every radar consumer (grouped skills, project match) so the
 * subject/importance/level_public mapping exists exactly once.
 */
export function toRadarData(
  skills: RadarDataSkill[],
): { subject: string; importance: number; level_public: number }[] {
  return skills.map((s) => ({
    subject: s.name,
    importance: s.importance ?? 0,
    level_public: s.level_public ?? 0,
  }));
}
