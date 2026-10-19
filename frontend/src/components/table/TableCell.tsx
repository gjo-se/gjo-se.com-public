import { cn } from '@src/lib/utils';

import { tableCellVariants } from './TableCell.variants';

import type { TableCellProps } from './TableCell.interface';

/** Standard data cell with alignment, padding and whitespace defaults. */
export default function TableCell({ children, alignment, compact, ...domProps }: TableCellProps) {
  return (
    <td
      data-slot="table-cell"
      className={cn(tableCellVariants({ alignment, compact }))}
      {...domProps}
    >
      {children}
    </td>
  );
}
