import type { TableHeadVariants } from './TableHead.variants';
import type { ComponentPropsWithoutRef } from 'react';

export interface TableHeadProps
  extends TableHeadVariants,
    Omit<ComponentPropsWithoutRef<'th'>, 'className'> {
  children?: React.ReactNode;
}
