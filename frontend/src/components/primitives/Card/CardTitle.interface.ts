import type { CardTitleVariants } from './CardTitle.variants';
import type { ComponentPropsWithoutRef } from 'react';

export interface CardTitleProps extends CardTitleVariants, Omit<ComponentPropsWithoutRef<'div'>, 'className' | 'style'> {
  children?: React.ReactNode;
}
