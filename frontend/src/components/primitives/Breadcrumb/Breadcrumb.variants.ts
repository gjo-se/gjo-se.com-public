import { cva, type VariantProps } from 'class-variance-authority';

export const breadcrumbVariants = cva('', {
  variants: {
    separator: {
      default: '',
      slash: '',
      arrow: '',
    },
  },
  defaultVariants: {
    separator: 'default',
  },
});

export type BreadcrumbVariants = VariantProps<typeof breadcrumbVariants>;
