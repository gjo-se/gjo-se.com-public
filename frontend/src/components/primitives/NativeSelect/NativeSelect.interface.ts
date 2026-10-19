import type { NativeSelectVariants } from './NativeSelect.variants';
import type { ComponentPropsWithoutRef } from 'react';
export interface NativeSelectProps extends NativeSelectVariants, Omit<ComponentPropsWithoutRef<'select'>, 'size' | 'className' | 'style'> { size?: 'sm' | 'default'; }
