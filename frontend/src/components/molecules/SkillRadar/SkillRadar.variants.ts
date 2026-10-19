import { cva, type VariantProps } from 'class-variance-authority';

/** Klickbare Radar-Fläche der Kompaktkarte. */
export const skillRadarChartVariants = cva('cursor-pointer rounded border border-border p-1 hover:border-ring');

/** Zeile der kompakten Text-Fallback-Liste. */
export const skillRadarRowVariants = cva('flex items-center gap-2 text-xs');

/** Feste Namensspalte mit Kürzung. */
export const skillRadarNameVariants = cva('w-24 truncate');

/** Importance-/Level-Balken. */
export const skillRadarBarVariants = cva('inline-block h-1.5 rounded bg-chart-1');

/** Feste Level-Spalte, rechtsbündig mit Tabellenziffern. */
export const skillRadarLevelVariants = cva('w-4 text-right tabular-nums');

export type SkillRadarVariants = VariantProps<typeof skillRadarChartVariants>;
