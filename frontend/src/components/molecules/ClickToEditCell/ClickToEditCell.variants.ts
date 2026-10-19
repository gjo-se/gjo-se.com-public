import { cva, type VariantProps } from 'class-variance-authority';

/** Wrapper der Inline-Edit-Zelle – feste Zeilenhöhe, volle Zellenbreite. */
export const clickToEditCellWrapperVariants = cva('h-7 w-full');

export type ClickToEditCellVariants = VariantProps<typeof clickToEditCellWrapperVariants>;
