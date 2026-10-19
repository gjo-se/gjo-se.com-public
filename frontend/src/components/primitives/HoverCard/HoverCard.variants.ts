import { cva, type VariantProps } from 'class-variance-authority';

export const hoverCardVariants = cva('', {
  variants: {},
  defaultVariants: {},
});

export type HoverCardVariants = VariantProps<typeof hoverCardVariants>;
