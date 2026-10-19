import type { AspectRatioVariants } from './AspectRatio.variants';
import type { ComponentPropsWithoutRef } from 'react';

export interface AspectRatioProps extends AspectRatioVariants, Omit<ComponentPropsWithoutRef<'div'>, 'className' | 'style'> {
  ratio: number;
  children?: React.ReactNode;
}
