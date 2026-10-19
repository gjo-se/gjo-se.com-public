import type { CardHeaderVariants } from './CardHeader.variants';
import type { ComponentPropsWithoutRef } from 'react';

export interface CardHeaderProps extends CardHeaderVariants, Omit<ComponentPropsWithoutRef<'div'>, 'className' | 'style'> {
  children?: React.ReactNode;
}
