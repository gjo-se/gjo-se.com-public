import { cva, type VariantProps } from 'class-variance-authority';
export const scrollBarVariants = cva('flex touch-none p-px transition-colors select-none data-horizontal:h-2.5 data-horizontal:flex-col data-horizontal:border-t data-horizontal:border-t-transparent data-vertical:h-full data-vertical:w-2.5 data-vertical:border-l data-vertical:border-l-transparent', { variants: {}, defaultVariants: {} });
export type ScrollBarVariants = VariantProps<typeof scrollBarVariants>;
