import { cva, type VariantProps } from 'class-variance-authority';

export const tableHeadVariants = cva(
    'h-14 px-4 py-2.5 align-middle font-bold text-xs whitespace-nowrap overflow-hidden text-ellipsis cursor-pointer select-none text-gray-500 uppercase hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 [&:has([role=checkbox])]:pr-0',
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

export type TableHeadVariants = VariantProps<typeof tableHeadVariants>;
