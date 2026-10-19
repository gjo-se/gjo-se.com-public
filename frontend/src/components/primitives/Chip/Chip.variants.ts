import { cva, type VariantProps } from 'class-variance-authority';

export const chipVariants = cva(
  'inline-flex items-center gap-1 rounded-full border border-transparent px-2.5 py-0.5 text-xs font-semibold transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
  {
    variants: {
      variant: {
        default:
          'bg-primary text-primary-foreground hover:bg-primary/80',
        destructive:
          'bg-destructive text-destructive-foreground hover:bg-destructive/80',
        error:
          'bg-destructive/10 text-destructive border-destructive/20',
        ghost:
          'hover:bg-muted hover:text-foreground',
        info:
          'bg-primary-subtle-bg text-primary-subtle-text border-primary-subtle-border',
        muted:
          'bg-muted text-muted-foreground',
        outline:
          'border-border bg-background shadow-xs hover:bg-muted',
        primary:
          'bg-primary text-primary-foreground shadow hover:bg-primary/90',
        secondary:
          'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        success:
          'bg-success/10 text-success border border-success/20',
        warning:
          'bg-warning/10 text-warning border border-warning/20',
      },
      size: {
        sm: 'h-5 px-2 text-xs',
        md: 'h-6 px-2.5 text-xs',
      },
      shape: {
        pill: 'rounded-full',
        rounded: 'rounded-md',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
      shape: 'pill',
    },
  },
);

export type ChipVariants = VariantProps<typeof chipVariants>;
