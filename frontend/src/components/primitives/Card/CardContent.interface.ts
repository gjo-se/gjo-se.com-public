import type { CardContentVariants } from './CardContent.variants';
import type { ComponentPropsWithoutRef } from 'react';

export interface CardContentProps extends CardContentVariants, Omit<ComponentPropsWithoutRef<'div'>, 'className' | 'style'> {
  children?: React.ReactNode;
}
