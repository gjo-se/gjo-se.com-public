import { cva, type VariantProps } from 'class-variance-authority';

export const iconVariants = cva('', {
  variants: {
    size: {
      xs: 'w-3.5 h-3.5',
      sm: 'w-4 h-4',
      md: 'w-4.5 h-4.5',
      lg: 'w-5 h-5',
      xl: 'w-6 h-6',
      xxl: 'w-7 h-7',
    },
    variant: {
      default: 'text-on-surface-secondary',
      muted: 'text-on-surface-subtle',
      blue: 'text-primary',
      green: 'text-success',
      red: 'text-destructive',
    },
  },
});

export type IconVariants = VariantProps<typeof iconVariants>;
