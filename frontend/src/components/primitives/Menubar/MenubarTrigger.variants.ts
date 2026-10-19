import { cva, type VariantProps } from 'class-variance-authority';
export const menubarTriggerVariants = cva('flex items-center rounded-sm px-2 py-1 text-sm font-medium outline-hidden select-none hover:bg-muted aria-expanded:bg-muted', { variants: {}, defaultVariants: {} });
export type MenubarTriggerVariants = VariantProps<typeof menubarTriggerVariants>;
