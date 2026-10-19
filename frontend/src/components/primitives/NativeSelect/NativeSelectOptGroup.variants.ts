import { cva, type VariantProps } from 'class-variance-authority';
export const nativeSelectOptGroupVariants = cva('bg-canvas text-canvas-text', { variants: {}, defaultVariants: {} });
export type NativeSelectOptGroupVariants = VariantProps<typeof nativeSelectOptGroupVariants>;
