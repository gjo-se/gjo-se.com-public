import { cva, type VariantProps } from 'class-variance-authority';

/** Feld-Zeile der Metadaten-Tabelle (Label | Wert). */
export const detailRowVariants = cva(
  'grid grid-cols-detail items-center gap-x-4 px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-800/50',
);

/** Wert-Spalte der Feld-Zeile (Clipping + Textgröße). */
export const detailValueVariants = cva('min-w-0 text-sm');

export type DetailShellVariants = VariantProps<typeof detailRowVariants>;
