import { cva, type VariantProps } from 'class-variance-authority';

/** 3D-Perspektiv-Wrapper der Archiviert-Karte. */
export const pctPerspectiveVariants = cva('[perspective:600px]');

/** Dreh-Fläche der Archiviert-Karte (Vorder-/Rückseite). */
export const pctFlipVariants = cva(
  'relative transition-transform duration-500 [transform-style:preserve-3d]',
);

/** Klickbare Radar-Fläche (Vorderseite der Archiviert-Karte). */
export const pctRadarButtonVariants = cva(
  'cursor-pointer rounded border border-border p-1 hover:border-ring',
);

/** Rückseiten-Fläche mit Inline-Liste und Aktionen. */
export const pctFlipBackVariants = cva(
  'absolute inset-0 [backface-visibility:hidden] [transform:rotateY(180deg)] rounded border border-border bg-background p-2 overflow-y-auto',
);

/** Zeile der Archiviert-Inline-Liste. */
export const pctArchivedRowVariants = cva('flex items-center justify-between gap-2 py-1 text-xs');

/** Tab-Leiste der Beschreibung. */
export const pctTabBarVariants = cva(
  'flex border-b border-gray-200 dark:border-gray-700 overflow-x-auto',
);

/** Dirty-Marker am Zusammenfassungs-Tab. */
export const pctDirtyDotVariants = cva(
  'ml-1 inline-block h-1.5 w-1.5 rounded-full bg-amber-500 align-middle',
);

/** Tab-Inhalt (Mindesthöhe). */
export const pctTabContentVariants = cva('p-4 min-h-30');

/** Ladehinweis-Zeile während der Zusammenfassung. */
export const pctMergeLoadingVariants = cva('flex items-center gap-2 text-on-surface/60');

export type ProjectComparisonTableVariants = VariantProps<typeof pctPerspectiveVariants>;
