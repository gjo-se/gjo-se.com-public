import { cva, type VariantProps } from 'class-variance-authority';
export const buttonGroupTextVariants = cva("flex items-center gap-2 rounded-md border bg-muted px-2.5 text-sm font-medium shadow-xs [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4", { variants: {}, defaultVariants: {} });
export type ButtonGroupTextVariants = VariantProps<typeof buttonGroupTextVariants>;
