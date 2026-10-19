import type { SliderVariants } from './Slider.variants';
import type { ComponentPropsWithoutRef } from 'react';

export interface SliderProps
  extends SliderVariants,
    Omit<ComponentPropsWithoutRef<'div'>, 'className' | 'style' | 'defaultValue'> {
  label?: string;
  value?: number | number[];
  defaultValue?: number | number[];
  min?: number;
  max?: number;
  step?: number;
  onValueChange?: (value: number | number[]) => void;
  /** Fires once when the user releases the thumb – use to persist the value. */
  onValueCommitted?: (value: number | number[]) => void;
  children?: React.ReactNode;
}
