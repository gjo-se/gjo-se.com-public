import type { CardVariants } from './Card.variants';
import type { ComponentPropsWithoutRef } from 'react';

export interface CardProps extends CardVariants, Omit<ComponentPropsWithoutRef<'div'>, 'className' | 'style'> {
  children?: React.ReactNode;
}
