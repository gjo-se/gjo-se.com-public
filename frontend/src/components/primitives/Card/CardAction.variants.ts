import { cva, type VariantProps } from 'class-variance-authority';

export const cardActionVariants = cva('col-start-2 row-span-2 row-start-1 self-start justify-self-end');

export type CardActionVariants = VariantProps<typeof cardActionVariants>;
