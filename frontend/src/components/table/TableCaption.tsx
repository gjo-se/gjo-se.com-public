import { cn } from '@src/lib/utils';

import { tableCaptionVariants } from './TableCaption.variants';

import type { TableCaptionProps } from './TableCaption.interface';

/** Table caption rendered below the table content. */
export default function TableCaption({ children, ...domProps }: TableCaptionProps) {
  return (
    <caption
      data-slot="table-caption"
      className={cn(tableCaptionVariants())}
      {...domProps}
    >
      {children}
    </caption>
  );
}
