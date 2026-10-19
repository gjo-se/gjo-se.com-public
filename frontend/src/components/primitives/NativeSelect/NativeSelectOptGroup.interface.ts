import type { NativeSelectOptGroupVariants } from './NativeSelectOptGroup.variants';
import type { ComponentPropsWithoutRef } from 'react';
export interface NativeSelectOptGroupProps extends NativeSelectOptGroupVariants, Omit<ComponentPropsWithoutRef<'optgroup'>, 'className' | 'style'> { children?: React.ReactNode; }
