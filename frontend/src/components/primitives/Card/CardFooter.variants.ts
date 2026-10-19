import { cva, type VariantProps } from 'class-variance-authority';

export const cardFooterVariants = cva(
  'flex items-center rounded-b-xl px-(--card-spacing) [.border-t]:pt-(--card-spacing)',
);

export type CardFooterVariants = VariantProps<typeof cardFooterVariants>;
