import type { TableCellVariants } from './TableCell.variants';
import type { ComponentPropsWithoutRef } from 'react';

export interface TableCellProps
  extends TableCellVariants,
    Omit<ComponentPropsWithoutRef<'td'>, 'className'> {
  children?: React.ReactNode;
}
