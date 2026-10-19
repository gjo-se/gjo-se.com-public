import { cva, type VariantProps } from 'class-variance-authority';

export const commandVariants = cva('flex size-full flex-col overflow-hidden rounded-xl bg-popover p-1 text-popover-foreground', {
  variants: {},
  defaultVariants: {},
});

export type CommandVariants = VariantProps<typeof commandVariants>;
