import { cva, type VariantProps } from 'class-variance-authority';
export const resizablePanelVariants = cva('', { variants: {}, defaultVariants: {} });
export type ResizablePanelVariants = VariantProps<typeof resizablePanelVariants>;
