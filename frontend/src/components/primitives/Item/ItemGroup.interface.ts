import type { ItemGroupVariants } from './ItemGroup.variants';
import type { ComponentPropsWithoutRef } from 'react';
export interface ItemGroupProps extends ItemGroupVariants, Omit<ComponentPropsWithoutRef<'div'>, 'className' | 'style'> { children?: React.ReactNode; }
