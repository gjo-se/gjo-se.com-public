import { cva, type VariantProps } from 'class-variance-authority';

export const hoverCardTriggerVariants = cva('', {
  variants: {},
  defaultVariants: {},
});

export type HoverCardTriggerVariants = VariantProps<typeof hoverCardTriggerVariants>;
