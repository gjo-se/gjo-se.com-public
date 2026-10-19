import { cva, type VariantProps } from 'class-variance-authority';
export const itemTitleVariants = cva('line-clamp-1 flex w-fit items-center gap-2 text-sm leading-snug font-medium underline-offset-4', { variants: {}, defaultVariants: {} });
export type ItemTitleVariants = VariantProps<typeof itemTitleVariants>;
