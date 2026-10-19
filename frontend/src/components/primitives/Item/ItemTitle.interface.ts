import type { ItemTitleVariants } from './ItemTitle.variants';
import type { ComponentPropsWithoutRef } from 'react';
export interface ItemTitleProps extends ItemTitleVariants, Omit<ComponentPropsWithoutRef<'div'>, 'className' | 'style'> { children?: React.ReactNode; }
