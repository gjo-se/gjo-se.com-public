import { cva, type VariantProps } from 'class-variance-authority';

export const tabsContentVariants = cva('flex-1 text-sm outline-none', {
  variants: {},
  defaultVariants: {},
});

export type TabsContentVariants = VariantProps<typeof tabsContentVariants>;
