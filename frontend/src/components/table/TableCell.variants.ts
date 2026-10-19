import { cva, type VariantProps } from 'class-variance-authority';

export const tableCellVariants = cva(
    'px-4 py-3 align-middle whitespace-nowrap overflow-hidden text-ellipsis [&:has([role=checkbox])]:pr-0',
  {
    variants: {
      alignment: {
        left: 'text-left',
        center: 'text-center',
        right: 'text-right',
      },
      compact: {
        true: 'px-0',
      },
    },
    defaultVariants: {
      alignment: 'left',
    },
  },
);

export type TableCellVariants = VariantProps<typeof tableCellVariants>;
