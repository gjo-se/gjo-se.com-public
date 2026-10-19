import type { TableBodyVariants } from './TableBody.variants';
import type { ComponentPropsWithoutRef } from 'react';

export interface TableBodyProps
  extends TableBodyVariants,
    Omit<ComponentPropsWithoutRef<'tbody'>, 'className'> {
  children?: React.ReactNode;
}
