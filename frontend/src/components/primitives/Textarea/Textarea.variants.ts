import { cva, type VariantProps } from 'class-variance-authority';

export const textareaVariants = cva(
  'w-full min-w-0 rounded-md border border-input bg-transparent px-2.5 py-1.5 text-base shadow-xs transition outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm',
  {
    variants: {
      resize: {
        both: 'resize',
        vertical: 'resize-y',
        horizontal: 'resize-x',
        none: 'resize-none',
      },
    },
    defaultVariants: {
      resize: 'vertical',
    },
  },
);

export type TextareaVariants = VariantProps<typeof textareaVariants>;
