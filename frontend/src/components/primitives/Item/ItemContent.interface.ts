import type { ItemContentVariants } from './ItemContent.variants';
import type { ComponentPropsWithoutRef } from 'react';
export interface ItemContentProps extends ItemContentVariants, Omit<ComponentPropsWithoutRef<'div'>, 'className' | 'style'> { children?: React.ReactNode; }
