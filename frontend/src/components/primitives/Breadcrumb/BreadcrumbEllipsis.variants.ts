import { cva, type VariantProps } from 'class-variance-authority';
export const breadcrumbEllipsisVariants = cva('flex size-5 items-center justify-center [&>svg]:size-4', { variants: {}, defaultVariants: {} });
export type BreadcrumbEllipsisVariants = VariantProps<typeof breadcrumbEllipsisVariants>;
