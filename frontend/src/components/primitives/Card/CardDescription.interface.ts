import type { CardDescriptionVariants } from './CardDescription.variants';
import type { ComponentPropsWithoutRef } from 'react';

export interface CardDescriptionProps extends CardDescriptionVariants, Omit<ComponentPropsWithoutRef<'div'>, 'className' | 'style'> {
  children?: React.ReactNode;
}
