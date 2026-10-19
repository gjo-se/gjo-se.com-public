import { cva, type VariantProps } from 'class-variance-authority';

export const emptyDescriptionVariants = cva(
  'text-sm/relaxed text-muted-foreground [&>a]:underline [&>a]:underline-offset-4 [&>a:hover]:text-primary',
  { variants: {}, defaultVariants: {} },
);

export type EmptyDescriptionVariants = VariantProps<typeof emptyDescriptionVariants>;
