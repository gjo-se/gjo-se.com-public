import { cva, type VariantProps } from 'class-variance-authority';
export const toggleGroupItemVariants = cva('shrink-0 focus:z-10 focus-visible:z-10 data-[state=on]:bg-muted', { variants: {}, defaultVariants: {} });
export type ToggleGroupItemVariants = VariantProps<typeof toggleGroupItemVariants>;
