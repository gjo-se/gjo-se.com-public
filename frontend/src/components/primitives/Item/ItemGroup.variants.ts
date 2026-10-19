import { cva, type VariantProps } from 'class-variance-authority';

export const itemGroupVariants = cva(
  'group/item-group flex w-full flex-col gap-4 has-data-[size=sm]:gap-2.5 has-data-[size=xs]:gap-2',
  { variants: {}, defaultVariants: {} },
);
export type ItemGroupVariants = VariantProps<typeof itemGroupVariants>;
