import { cva, type VariantProps } from 'class-variance-authority';
export const menubarShortcutVariants = cva('ml-auto text-xs tracking-widest text-muted-foreground group-focus/menubar-item:text-accent-foreground', { variants: {}, defaultVariants: {} });
export type MenubarShortcutVariants = VariantProps<typeof menubarShortcutVariants>;
