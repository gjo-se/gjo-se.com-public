import { cva, type VariantProps } from 'class-variance-authority';
export const breadcrumbLinkVariants = cva('transition-colors hover:text-foreground', { variants: {}, defaultVariants: {} });
export type BreadcrumbLinkVariants = VariantProps<typeof breadcrumbLinkVariants>;
