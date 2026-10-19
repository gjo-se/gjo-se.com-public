import { cva, type VariantProps } from 'class-variance-authority';
export const commandShortcutVariants = cva('ml-auto text-xs tracking-widest text-muted-foreground', { variants: {}, defaultVariants: {} });
export type CommandShortcutVariants = VariantProps<typeof commandShortcutVariants>;
