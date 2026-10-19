import { cva, type VariantProps } from 'class-variance-authority';

export const cardVariants = cva(
  'group/card flex flex-col gap-(--card-spacing) rounded-xl bg-card py-(--card-spacing) text-sm text-card-foreground shadow-xs ring-1 ring-foreground/10 [--card-spacing:--spacing(6)] has-[>img:first-child]:pt-0 *:[img:first-child]:rounded-t-xl *:[img:last-child]:rounded-b-xl',
  {
    variants: {
      variant: {
        default: '',
        error: 'ring-red-200 bg-red-50 dark:bg-red-950',
        /** Flächige Panel-Karte (Border statt Ring, flacher Schatten) – z. B. Login-Karte. */
        surface: 'gap-0 border border-border-light bg-card shadow-sm ring-0',
      },
      size: {
        default: '',
        sm: '[--card-spacing:--spacing(4)]',
        /** Großzügiges Karten-Padding (`p-8` / `md:p-10`) – z. B. Login-Karte. */
        lg: 'p-8 md:p-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

export type CardVariants = VariantProps<typeof cardVariants>;
