import { cva, type VariantProps } from 'class-variance-authority';
export const alertActionVariants = cva('absolute top-2.5 right-3', { variants: {}, defaultVariants: {} });
export type AlertActionVariants = VariantProps<typeof alertActionVariants>;
