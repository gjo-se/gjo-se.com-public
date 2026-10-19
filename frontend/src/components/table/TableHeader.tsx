import { cn } from '@src/lib/utils';

import { tableHeaderVariants } from './TableHeader.variants';

import type { TableHeaderProps } from './TableHeader.interface';

/** Table head wrapper for header row groups. */
export default function TableHeader({ children, ...domProps }: TableHeaderProps) {
  return (
    <thead
      data-slot="table-header"
      className={cn(tableHeaderVariants())}
      {...domProps}
    >
      {children}
    </thead>
  );
}
