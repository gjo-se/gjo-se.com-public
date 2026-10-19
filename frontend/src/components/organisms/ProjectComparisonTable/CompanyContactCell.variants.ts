import { cva, type VariantProps } from 'class-variance-authority';

/** Zell-Layout: Spalte aus Firmenname und Picker. */
export const companyContactCellVariants = cva('flex min-w-0 flex-col gap-1.5');

export type CompanyContactCellVariants = VariantProps<typeof companyContactCellVariants>;
