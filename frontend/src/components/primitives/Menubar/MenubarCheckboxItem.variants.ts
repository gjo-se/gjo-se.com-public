import { cva, type VariantProps } from 'class-variance-authority';
export const menubarCheckboxItemVariants = cva('relative flex cursor-default items-center gap-2 rounded-md py-1.5 pr-2 pl-8 text-sm outline-hidden select-none focus:bg-accent focus:text-accent-foreground focus:**:text-accent-foreground data-inset:pl-8 data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0', { variants: {}, defaultVariants: {} });
export type MenubarCheckboxItemVariants = VariantProps<typeof menubarCheckboxItemVariants>;
