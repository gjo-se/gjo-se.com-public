import { cva, type VariantProps } from 'class-variance-authority';

export const cardContentVariants = cva('px-(--card-spacing)');

export type CardContentVariants = VariantProps<typeof cardContentVariants>;
