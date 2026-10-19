import { cva, type VariantProps } from 'class-variance-authority';

export const kbdVariants = cva(
  "pointer-events-none inline-flex h-5 w-fit min-w-5 items-center justify-center gap-1 rounded-sm bg-muted px-1 font-sans text-xs font-medium text-muted-foreground select-none [&_svg:not([class*='size-'])]:size-3",
  {
    variants: {},
    defaultVariants: {},
  },
);

export type KbdVariants = VariantProps<typeof kbdVariants>;
