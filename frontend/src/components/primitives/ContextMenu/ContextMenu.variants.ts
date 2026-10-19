import { cva, type VariantProps } from 'class-variance-authority';

export const contextMenuVariants = cva('', {
  variants: {},
  defaultVariants: {},
});

export type ContextMenuVariants = VariantProps<typeof contextMenuVariants>;
