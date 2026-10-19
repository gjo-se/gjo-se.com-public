import type { CardActionVariants } from './CardAction.variants';
import type { ComponentPropsWithoutRef } from 'react';

export interface CardActionProps extends CardActionVariants, Omit<ComponentPropsWithoutRef<'div'>, 'className' | 'style'> {
  children?: React.ReactNode;
}
