import { cva, type VariantProps } from 'class-variance-authority';

export const inputGroupAddonVariants = cva(
  "flex h-auto cursor-text items-center justify-center gap-2 py-1.5 text-sm font-medium text-muted-foreground select-none group-data-[disabled=true]/input-group:opacity-50 [&>kbd]:rounded-input-addon [&>svg:not([class*='size-'])]:size-4",
  {
    variants: {
      align: {
        'inline-start': 'order-first pl-2 has-[>button]:-ml-1 has-[>kbd]:ml-kbd-offset',
        'inline-end': 'order-last pr-2 has-[>button]:-mr-1 has-[>kbd]:mr-kbd-offset',
        'block-start': 'order-first w-full justify-start px-2.5 pt-2 group-has-[>input]/input-group:pt-2 [.border-b]:pb-2',
        'block-end': 'order-last w-full justify-start px-2.5 pb-2 group-has-[>input]/input-group:pb-2 [.border-t]:pt-2',
      },
    },
    defaultVariants: { align: 'inline-start' },
  },
);

export type InputGroupAddonVariants = VariantProps<typeof inputGroupAddonVariants>;
