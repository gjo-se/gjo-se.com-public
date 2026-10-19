import { cva, type VariantProps } from 'class-variance-authority';
export const menubarLabelVariants = cva('px-2 py-1.5 text-sm font-medium data-inset:pl-8', { variants: {}, defaultVariants: {} });
export type MenubarLabelVariants = VariantProps<typeof menubarLabelVariants>;
