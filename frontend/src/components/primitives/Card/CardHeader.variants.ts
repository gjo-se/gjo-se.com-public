import { cva, type VariantProps } from 'class-variance-authority';

export const cardHeaderVariants = cva(
  'group/card-header @container/card-header grid auto-rows-min items-start gap-1 rounded-t-xl px-(--card-spacing) has-data-[slot=card-action]:grid-cols-card-action has-data-[slot=card-description]:grid-rows-card-header [.border-b]:pb-(--card-spacing)',
);

export type CardHeaderVariants = VariantProps<typeof cardHeaderVariants>;
