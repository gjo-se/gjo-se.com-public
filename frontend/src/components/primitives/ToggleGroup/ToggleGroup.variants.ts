import { cva, type VariantProps } from 'class-variance-authority';
export const toggleGroupVariants = cva('group/toggle-group flex w-fit flex-row items-center gap-toggle-group rounded-md data-vertical:flex-col data-vertical:items-stretch', { variants: {}, defaultVariants: {} });
export type ToggleGroupVariants = VariantProps<typeof toggleGroupVariants>;
