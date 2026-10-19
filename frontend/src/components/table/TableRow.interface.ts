import type { TableRowVariants } from './TableRow.variants';
import type { ComponentPropsWithoutRef } from 'react';

export interface TableRowProps
  extends TableRowVariants,
    Omit<ComponentPropsWithoutRef<'tr'>, 'className' | 'style'> {
  children?: React.ReactNode;
}
