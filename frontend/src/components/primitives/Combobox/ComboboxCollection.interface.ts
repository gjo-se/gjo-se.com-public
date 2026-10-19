import type { ComboboxCollectionVariants } from './ComboboxCollection.variants';
import type { ComponentPropsWithoutRef } from 'react';
export interface ComboboxCollectionProps extends ComboboxCollectionVariants, Omit<ComponentPropsWithoutRef<'div'>, 'className' | 'style'> { children?: React.ReactNode; }
