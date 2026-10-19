import type { ToggleVariants } from './Toggle.variants';
import type { ComponentPropsWithoutRef } from 'react';

export interface ToggleProps
  extends ToggleVariants,
    Omit<ComponentPropsWithoutRef<'button'>, 'className' | 'style' | 'value'> {
  pressed?: boolean;
  defaultPressed?: boolean;
  onPressedChange?: (pressed: boolean) => void;
  disabled?: boolean;
  children?: React.ReactNode;
}
