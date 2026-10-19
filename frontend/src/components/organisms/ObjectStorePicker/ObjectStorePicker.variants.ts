import { cva, type VariantProps } from 'class-variance-authority';

/** Kleine Auswahl-Vorschau im Trigger (festes Maß, Rand, Fläche). */
export const pickerPreviewVariants = cva(
  'h-8 w-12 shrink-0 overflow-hidden rounded border border-gray-200 bg-gray-100 dark:border-gray-700 dark:bg-gray-800',
);

/** Ordner-Auswahl (feste Breite, nicht schrumpfend). */
export const pickerFolderSelectVariants = cva('w-44 shrink-0');

/** Scrollbereich der Asset-Liste (max. Viewport-Höhe). */
export const pickerListScrollVariants = cva('max-h-half-viewport overflow-y-auto');

/** Upload-Leiste am Dialog-Fuß (obere Trennung). */
export const pickerUploadBarVariants = cva('border-t border-gray-200 pt-3 dark:border-gray-700');

export type ObjectStorePickerVariants = VariantProps<typeof pickerPreviewVariants>;
