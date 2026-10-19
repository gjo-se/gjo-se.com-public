import { cva, type VariantProps } from 'class-variance-authority';

export const dialogTitleVariants = cva('font-heading leading-none font-medium', {
  variants: {
    layout: {
      /** Titel mit Inline-Inhalt (z. B. Label + Spinner) in einer Zeile. */
      inline: 'flex items-center gap-2',
    },
  },
  defaultVariants: {},
});

export type DialogTitleVariants = VariantProps<typeof dialogTitleVariants>;
