import { cn } from '@src/lib/utils';

import { tableRootVariants } from './TableRoot.variants';

import type { TableRootProps } from './TableRoot.interface';

/** Root table component with scrollable overflow container. */
export default function TableRoot({ children, ...domProps }: TableRootProps) {
  return (
    <div
      data-slot="table-container"
      className="relative w-full overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900 dark:shadow-none"
    >
      <table
        data-slot="table"
        className={cn(tableRootVariants())}
        {...domProps}
      >
        {children}
      </table>
    </div>
  );
}
