import { cva, type VariantProps } from 'class-variance-authority';
export const breadcrumbSeparatorVariants = cva('[&>svg]:size-3.5', { variants: {}, defaultVariants: {} });
export type BreadcrumbSeparatorVariants = VariantProps<typeof breadcrumbSeparatorVariants>;
