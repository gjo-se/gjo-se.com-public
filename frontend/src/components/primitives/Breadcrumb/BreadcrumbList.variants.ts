import { cva, type VariantProps } from 'class-variance-authority';
export const breadcrumbListVariants = cva('flex flex-wrap items-center gap-1.5 text-sm wrap-break-word text-muted-foreground sm:gap-2.5', { variants: {}, defaultVariants: {} });
export type BreadcrumbListVariants = VariantProps<typeof breadcrumbListVariants>;
