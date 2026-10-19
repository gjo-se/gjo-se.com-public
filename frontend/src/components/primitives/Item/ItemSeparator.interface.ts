import type { ItemSeparatorVariants } from './ItemSeparator.variants';
import type { ComponentPropsWithoutRef } from 'react';
export interface ItemSeparatorProps extends ItemSeparatorVariants, Omit<ComponentPropsWithoutRef<'div'>, 'className' | 'style'> { children?: React.ReactNode; }
