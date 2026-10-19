import { cva, type VariantProps } from 'class-variance-authority';

export const cardTitleVariants = cva(
  'font-heading text-base leading-normal font-medium group-data-[size=sm]/card:text-sm',
);

export type CardTitleVariants = VariantProps<typeof cardTitleVariants>;
