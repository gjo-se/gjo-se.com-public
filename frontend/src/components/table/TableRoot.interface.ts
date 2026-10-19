import type { TableRootVariants } from './TableRoot.variants';
import type { ComponentPropsWithoutRef } from 'react';

export interface TableRootProps
  extends TableRootVariants,
    Omit<ComponentPropsWithoutRef<'table'>, 'className'> {
  children?: React.ReactNode;
}
