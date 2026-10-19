import { cva, type VariantProps } from 'class-variance-authority';
export const nativeSelectOptionVariants = cva('bg-canvas text-canvas-text', { variants: {}, defaultVariants: {} });
export type NativeSelectOptionVariants = VariantProps<typeof nativeSelectOptionVariants>;
