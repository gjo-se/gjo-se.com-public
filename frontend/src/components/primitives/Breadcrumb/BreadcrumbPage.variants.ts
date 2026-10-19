import { cva, type VariantProps } from 'class-variance-authority';
export const breadcrumbPageVariants = cva('font-normal text-foreground', { variants: {}, defaultVariants: {} });
export type BreadcrumbPageVariants = VariantProps<typeof breadcrumbPageVariants>;
