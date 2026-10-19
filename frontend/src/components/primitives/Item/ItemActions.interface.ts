import type { ItemActionsVariants } from './ItemActions.variants';
import type { ComponentPropsWithoutRef } from 'react';
export interface ItemActionsProps extends ItemActionsVariants, Omit<ComponentPropsWithoutRef<'div'>, 'className' | 'style'> { children?: React.ReactNode; }
