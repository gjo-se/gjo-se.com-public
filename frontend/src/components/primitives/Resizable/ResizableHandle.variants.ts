import { cva, type VariantProps } from 'class-variance-authority';
export const resizableHandleVariants = cva('relative flex w-px items-center justify-center bg-border ring-offset-background after:absolute after:inset-y-0 after:left-1/2 after:w-1 after:-translate-x-1/2 focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-hidden aria-[orientation=horizontal]:h-px aria-[orientation=horizontal]:w-full', { variants: {}, defaultVariants: {} });
export type ResizableHandleVariants = VariantProps<typeof resizableHandleVariants>;
