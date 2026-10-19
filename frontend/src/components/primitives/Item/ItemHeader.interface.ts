import type { ItemHeaderVariants } from './ItemHeader.variants';
import type { ComponentPropsWithoutRef } from 'react';
export interface ItemHeaderProps extends ItemHeaderVariants, Omit<ComponentPropsWithoutRef<'div'>, 'className' | 'style'> { children?: React.ReactNode; }
