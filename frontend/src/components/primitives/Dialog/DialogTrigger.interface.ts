import type { DialogTriggerVariants } from './DialogTrigger.variants';
import type { ComponentPropsWithoutRef } from 'react';

export interface DialogTriggerProps
  extends DialogTriggerVariants,
    ComponentPropsWithoutRef<'button'> {
  children?: React.ReactNode;
}
