import { graphic } from 'echarts';
import { useMemo } from 'react';

import ChartShell from '../ChartShell/ChartShell';
import {
  chartHeight,
  getChartMonoFontFamily,
  getGridStrokeColor,
  getMutedAxisLabelColor,
  getPrimaryColor,
  getSurfaceColor,
  withAlpha,
} from '../ChartShell/ChartShell.utils';
import { useThemeClass } from '../ChartShell/useThemeClass';

import {
  GLOW_BLUR_DARK,
  LINE_WIDTH_HERO,
  LINE_WIDTH_REF,
  RADAR_SPLIT_NUMBER,
  SPLIT_AREA_BANDS,
  SYMBOL_SIZE_HERO,
} from './RadarChart.utils';

import type { RadarChartProps } from './RadarChart.interface';
import type { EChartsOption, SeriesOption } from 'echarts';

/** Renders an echarts radar chart with multiple series, polar grid, legend, and tooltip. */
export default function RadarChart({
  data,
  radars,
  height = chartHeight + 40,
  loading,
  errorMessage,
  maxValue,
  showLegend = true,
  showTooltip = true,
  showSplitArea = false,
}: RadarChartProps) {
  const themeClass = useThemeClass();
  const isDark = themeClass === 'dark';

  const option: EChartsOption = useMemo(() => {
    // Re-resolve token colors (grid, axis labels) whenever the theme toggles.
    void themeClass;
    const gridColor = getGridStrokeColor();
    const surface = getSurfaceColor();
    const primary = getPrimaryColor();
    const mono = getChartMonoFontFamily();
    // Soft neutral band for the value-range background (rings 1–2 and 3–4).
    const bandColor = withAlpha(primary, isDark ? 0.2 : 0.14);
    const splitAreaColors = Array.from(
      { length: RADAR_SPLIT_NUMBER },
      (_, i) => (SPLIT_AREA_BANDS.has(i) ? bandColor : 'transparent'),
    );

    return {
      tooltip: showTooltip
        ? {
            trigger: 'item' as const,
            confine: true,
            backgroundColor: surface,
            borderColor: withAlpha(primary, 0.4),
            borderWidth: 1,
            padding: [8, 12],
            textStyle: {
              color: getMutedAxisLabelColor(),
              fontFamily: mono,
              fontSize: 11,
            },
            extraCssText:
              'border-radius: 6px; box-shadow: 0 6px 20px rgba(0, 0, 0, 0.28);',
          }
        : { show: false },
      legend: showLegend
        ? {
            show: true,
            bottom: 0,
            icon: 'roundRect',
            itemWidth: 14,
            itemHeight: 2,
            textStyle: {
              color: getMutedAxisLabelColor(),
              fontFamily: mono,
              fontSize: 11,
            },
          }
        : { show: false },
      textStyle: { fontFamily: mono },
      radar: {
        indicator: data.map((d) => ({
          name: d.subject,
          max: maxValue,
        })),
        // ECharts-Default ist gegen den Uhrzeigersinn (Platz 2 → 11 Uhr). Im
        // Uhrzeigersinn (Platz 2 → 1 Uhr) ist die Leserichtung der Prioritäten natürlich.
        clockwise: true,
        center: ['50%', '48%'],
        radius: '68%',
        // Feines Raster: 5 Ringe bei maxValue 5 → 1er-Schritte.
        splitNumber: RADAR_SPLIT_NUMBER,
        // Spinnennetz klar erkennbar: Ringe solid, gut sichtbar (SciChart-Anker).
        splitLine: {
          lineStyle: { color: withAlpha(gridColor, 0.6), width: 1 },
        },
        // Speichen als tragendes Gerüst – kräftigster Teil des Grids.
        axisLine: {
          lineStyle: { color: gridColor, width: 1 },
        },
        // Optionales Ring-Banding (nur Admin-Charts): hebt die 1–2- und 3–4-
        // Wertebänder hervor, damit Werte leichter ablesbar sind. Default aus,
        // damit die Public-Charts unverändert bleiben.
        splitArea: showSplitArea
          ? { show: true, areaStyle: { opacity: 1, color: splitAreaColors } }
          : { show: false },
        axisName: {
          color: getMutedAxisLabelColor(),
          fontSize: 10,
          fontFamily: mono,
        },
      },
      series: radars.map((r, idx): SeriesOption => {
        const color = r.stroke ?? r.fill;
        const isReference = idx === 0;

        // ── Soll-Referenz (erste Serie): ruhige dashed Kontur, keine Fläche/Punkte ──
        if (isReference) {
          return {
            type: 'radar' as const,
            name: r.name ?? r.dataKey,
            data: [
              {
                value: data.map((d) => Number(d[r.dataKey])),
                name: r.name ?? r.dataKey,
              },
            ],
            symbol: 'none',
            lineStyle: {
              ...(color ? { color } : {}),
              width: LINE_WIDTH_REF,
              type: 'dashed' as const,
              cap: 'round' as const,
              join: 'round' as const,
            },
            areaStyle: { opacity: 0 },
            // Keine Hover-Reaktion: echarts-native Emphasis blendet bei nahezu
            // deckungsgleichen Importance-/Level-Polygonen die Gegenlinie aus.
            emphasis: { disabled: true },
            z: 2,
          };
        }

        // ── Ist-Heldin (weitere Serien): Glow, Ring-Punkte, Flächen-Gradient ──
        return {
          type: 'radar' as const,
          name: r.name ?? r.dataKey,
          data: [
            {
              value: data.map((d) => Number(d[r.dataKey])),
              name: r.name ?? r.dataKey,
            },
          ],
          // Ring-Punkte: Surface-Füllung + Serien-Border → präzise, edel, kein „Klecks".
          symbol: 'circle',
          symbolSize: SYMBOL_SIZE_HERO,
          itemStyle: {
            color: surface,
            ...(color ? { borderColor: color } : {}),
            borderWidth: 2,
          },
          lineStyle: {
            ...(color ? { color } : {}),
            width: LINE_WIDTH_HERO,
            cap: 'round' as const,
            join: 'round' as const,
            // Glow nur im Dark-Theme – auf Ivory wirkt er schmutzig.
            ...(color && isDark
              ? { shadowColor: withAlpha(color, 0.4), shadowBlur: GLOW_BLUR_DARK }
              : {}),
          },
          // Radialer Flächen-Gradient (Zentrum → Rand): Volumen, das nach außen
          // abklingt – sehr dezent, damit die Ist-Heldin als Linie lesbar bleibt
          // und den Radar nicht als dominanter Farbblob überdeckt.
          areaStyle: color
            ? {
                color: new graphic.RadialGradient(0.5, 0.5, 0.7, [
                  { offset: 0, color: withAlpha(color, 0.08) },
                  { offset: 1, color: withAlpha(color, 0.02) },
                ]),
              }
            : { opacity: 0.08 },
          // echarts-native Emphasis bleibt aus; Hover-Reaktion via React-State.
          emphasis: { disabled: true },
          z: 3,
        };
      }),
    };
  }, [data, radars, maxValue, showLegend, showTooltip, showSplitArea, themeClass, isDark]);

  return (
    <ChartShell
      loading={loading}
      errorMessage={errorMessage}
      height={height}
      option={option}
    />
  );
}

export type { RadarChartProps } from './RadarChart.interface';
