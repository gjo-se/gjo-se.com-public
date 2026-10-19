import { cva, type VariantProps } from 'class-variance-authority';

export const cardDescriptionVariants = cva('text-sm text-muted-foreground');

export type CardDescriptionVariants = VariantProps<typeof cardDescriptionVariants>;
