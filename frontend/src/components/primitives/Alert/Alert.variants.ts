import { cva, type VariantProps } from 'class-variance-authority';

export const alertVariants = cva(
  'relative grid w-full gap-0.5 rounded-lg border px-4 py-3 text-left text-sm',
  {
    variants: {
      variant: {
        default: 'bg-card text-card-foreground',
        destructive: 'bg-card text-destructive',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

export type AlertVariants = VariantProps<typeof alertVariants>;
