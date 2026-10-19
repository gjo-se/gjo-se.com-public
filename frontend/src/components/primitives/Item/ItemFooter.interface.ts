import type { ItemFooterVariants } from './ItemFooter.variants';
import type { ComponentPropsWithoutRef } from 'react';
export interface ItemFooterProps extends ItemFooterVariants, Omit<ComponentPropsWithoutRef<'div'>, 'className' | 'style'> { children?: React.ReactNode; }
