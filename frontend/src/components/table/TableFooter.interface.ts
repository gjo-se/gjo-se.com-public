import type { TableFooterVariants } from './TableFooter.variants';
import type { ComponentPropsWithoutRef } from 'react';

export interface TableFooterProps
  extends TableFooterVariants,
    Omit<ComponentPropsWithoutRef<'tfoot'>, 'className'> {
  children?: React.ReactNode;
}
