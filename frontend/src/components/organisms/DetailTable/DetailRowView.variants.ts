import { cva, type VariantProps } from 'class-variance-authority';

/** Inline-Edit-Wrapper der Wert-Spalte – feste Zeilenhöhe, volle Zellenbreite. */
export const detailRowValueWrapperVariants = cva('h-7 w-full');

export type DetailRowViewVariants = VariantProps<typeof detailRowValueWrapperVariants>;
