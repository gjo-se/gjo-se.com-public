import { cva, type VariantProps } from 'class-variance-authority';
export const resizablePanelGroupVariants = cva('flex h-full w-full aria-[orientation=vertical]:flex-col', { variants: {}, defaultVariants: {} });
export type ResizablePanelGroupVariants = VariantProps<typeof resizablePanelGroupVariants>;
