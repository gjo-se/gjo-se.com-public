import { cn } from '@src/lib/utils';

import { tableFooterVariants } from './TableFooter.variants';

import type { TableFooterProps } from './TableFooter.interface';

/** Table footer wrapper with top border and muted background. */
export default function TableFooter({ children, ...domProps }: TableFooterProps) {
  return (
    <tfoot
      data-slot="table-footer"
      className={cn(tableFooterVariants())}
      {...domProps}
    >
      {children}
    </tfoot>
  );
}
