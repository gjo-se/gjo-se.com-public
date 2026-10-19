import type { ComponentPropsWithoutRef } from 'react';

export interface DirectionProviderProps extends Omit<ComponentPropsWithoutRef<'div'>, 'className' | 'style'> {
  direction?: 'ltr' | 'rtl';
}
