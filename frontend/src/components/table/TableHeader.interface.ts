import type { TableHeaderVariants } from './TableHeader.variants';
import type { ComponentPropsWithoutRef } from 'react';

export interface TableHeaderProps
  extends TableHeaderVariants,
    Omit<ComponentPropsWithoutRef<'thead'>, 'className'> {
  children?: React.ReactNode;
}
