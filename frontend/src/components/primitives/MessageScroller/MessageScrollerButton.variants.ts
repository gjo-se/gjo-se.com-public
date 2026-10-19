import { cva, type VariantProps } from 'class-variance-authority';

export const messageScrollerButtonVariants = cva(
    'absolute inset-s-1/2 -translate-x-1/2 border-border bg-background text-foreground transition duration-200 hover:bg-muted hover:text-foreground', {
    variants: {},
    defaultVariants: {},
});

export type MessageScrollerButtonVariants = VariantProps<typeof messageScrollerButtonVariants>;
