import { cva, type VariantProps } from 'class-variance-authority';

export const inputGroupTextVariants = cva(
  "flex items-center gap-2 text-sm text-muted-foreground [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4",
  { variants: {}, defaultVariants: {} },
);

export type InputGroupTextVariants = VariantProps<typeof inputGroupTextVariants>;
