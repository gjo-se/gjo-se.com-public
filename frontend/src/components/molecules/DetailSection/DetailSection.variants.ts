import { cva, type VariantProps } from 'class-variance-authority';

/** Rahmen-Karte im DetailTable-Stil (border-gray-200, bg-gray-50-Kopf). */
export const detailSectionContainerVariants = cva(
  'overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900 dark:shadow-none',
);

/** Kopfleiste der Rahmen-Karte – gedämpfte Fläche mit unterer Haarlinie. */
export const detailSectionHeaderVariants = cva(
  'border-b border-gray-200 bg-gray-50 px-4 py-2 dark:border-gray-700 dark:bg-gray-800',
);

export type DetailSectionVariants = VariantProps<typeof detailSectionContainerVariants>;
