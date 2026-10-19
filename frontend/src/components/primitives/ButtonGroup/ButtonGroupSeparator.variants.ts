import { cva, type VariantProps } from 'class-variance-authority';
export const buttonGroupSeparatorVariants = cva('relative self-stretch bg-input data-horizontal:mx-px data-horizontal:w-auto data-vertical:my-px data-vertical:h-auto', { variants: {}, defaultVariants: {} });
export type ButtonGroupSeparatorVariants = VariantProps<typeof buttonGroupSeparatorVariants>;
