import { cva, type VariantProps } from 'class-variance-authority';

export const tabsVariants = cva('group/tabs flex gap-2 data-horizontal:flex-col', {
  variants: {},
  defaultVariants: {},
});

export type TabsVariants = VariantProps<typeof tabsVariants>;
