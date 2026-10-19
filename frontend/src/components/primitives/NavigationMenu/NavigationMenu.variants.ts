import { cva, type VariantProps } from 'class-variance-authority';

export const navigationMenuVariants = cva(
  'group/navigation-menu relative flex max-w-max flex-1 items-center justify-center',
  {
    variants: {},
    defaultVariants: {},
  },
);

export type NavigationMenuVariants = VariantProps<typeof navigationMenuVariants>;
