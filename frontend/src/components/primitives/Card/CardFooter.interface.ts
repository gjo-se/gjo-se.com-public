import type { CardFooterVariants } from './CardFooter.variants';
import type { ComponentPropsWithoutRef } from 'react';

export interface CardFooterProps extends CardFooterVariants, Omit<ComponentPropsWithoutRef<'div'>, 'className' | 'style'> {
  children?: React.ReactNode;
}
