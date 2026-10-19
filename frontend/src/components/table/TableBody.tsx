import { cn } from '@src/lib/utils';

import { tableBodyVariants } from './TableBody.variants';

import type { TableBodyProps } from './TableBody.interface';

/** Table body wrapper with standard row styling. */
export default function TableBody({ children, ...domProps }: TableBodyProps) {
  return (
    <tbody
      data-slot="table-body"
      className={cn(tableBodyVariants())}
      {...domProps}
    >
      {children}
    </tbody>
  );
}
