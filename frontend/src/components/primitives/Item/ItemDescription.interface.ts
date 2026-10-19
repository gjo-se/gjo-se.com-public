import type { ItemDescriptionVariants } from './ItemDescription.variants';
import type { ComponentPropsWithoutRef } from 'react';
export interface ItemDescriptionProps extends ItemDescriptionVariants, Omit<ComponentPropsWithoutRef<'p'>, 'className' | 'style'> { children?: React.ReactNode; }
