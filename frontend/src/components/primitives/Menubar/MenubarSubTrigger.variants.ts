import { cva, type VariantProps } from 'class-variance-authority';
export const menubarSubTriggerVariants = cva("gap-2 rounded-sm px-2 py-1.5 text-sm focus:bg-accent focus:text-accent-foreground data-inset:pl-8 data-open:bg-accent data-open:text-accent-foreground [&_svg:not([class*='size-'])]:size-4", { variants: {}, defaultVariants: {} });
export type MenubarSubTriggerVariants = VariantProps<typeof menubarSubTriggerVariants>;
