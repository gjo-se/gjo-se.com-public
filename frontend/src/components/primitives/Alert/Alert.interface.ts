import type { AlertVariants } from './Alert.variants';
import type { ComponentPropsWithoutRef } from 'react';

export interface AlertProps extends AlertVariants, Omit<ComponentPropsWithoutRef<'div'>, 'className' | 'style'> {
  children?: React.ReactNode;
}
