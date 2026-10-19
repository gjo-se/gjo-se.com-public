import { cva, type VariantProps } from 'class-variance-authority';

/** Zell-Layout: Spalte aus Kontaktname und Picker. */
export const contactPersonCellVariants = cva('flex min-w-0 flex-col gap-1.5');

export type ContactPersonCellVariants = VariantProps<typeof contactPersonCellVariants>;
