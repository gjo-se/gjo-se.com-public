import { cn } from '@src/lib/utils';

import { tableRowVariants } from './TableRow.variants';

import type { TableRowProps } from './TableRow.interface';

/** Table row with hover, selection and border styling. */
export default function TableRow({ children, muted, variant, ...domProps }: TableRowProps) {
  return (
    <tr
      data-slot="table-row"
      className={cn(tableRowVariants({ muted, variant }))}
      {...domProps}
    >
      {children}
    </tr>
  );
}
