import { cva, type VariantProps } from 'class-variance-authority';

/** Fester 16px-Icon-Rahmen vor einer Picker-Option (`<Image>` rendert `h-full w-full`). */
export const entityOptionIconVariants = cva('size-4 shrink-0 overflow-hidden');

export type EntityOptionIconVariants = VariantProps<typeof entityOptionIconVariants>;
