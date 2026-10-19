import { cn } from '@src/lib/utils';

import { tableHeadVariants } from './TableHead.variants';

import type { TableHeadProps } from './TableHead.interface';

/** Header cell with text alignment, font styling and spacing defaults. */
export default function TableHead({ children, alignment, compact, ...domProps }: TableHeadProps) {
  return (
    <th
      data-slot="table-head"
      className={cn(tableHeadVariants({ alignment, compact }))}
      {...domProps}
    >
      {children}
    </th>
  );
}
