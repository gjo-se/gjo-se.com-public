import { cva, type VariantProps } from 'class-variance-authority';
export const itemContentVariants = cva('flex flex-1 flex-col gap-1 group-data-[size=xs]/item:gap-0 [&+[data-slot=item-content]]:flex-none', { variants: {}, defaultVariants: {} });
export type ItemContentVariants = VariantProps<typeof itemContentVariants>;
