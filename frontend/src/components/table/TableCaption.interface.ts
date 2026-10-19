import type { TableCaptionVariants } from './TableCaption.variants';
import type { ComponentPropsWithoutRef } from 'react';

export interface TableCaptionProps
  extends TableCaptionVariants,
    Omit<ComponentPropsWithoutRef<'caption'>, 'className'> {
  children?: React.ReactNode;
}
