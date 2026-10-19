import type { ComboboxTriggerVariants } from './ComboboxTrigger.variants';
import type { ComponentPropsWithoutRef } from 'react';
export interface ComboboxTriggerProps extends ComboboxTriggerVariants, Omit<ComponentPropsWithoutRef<'button'>, 'className' | 'style'> { children?: React.ReactNode; }
