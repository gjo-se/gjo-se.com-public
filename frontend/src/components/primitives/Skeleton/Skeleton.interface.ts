import type { SkeletonVariants } from './Skeleton.variants';
import type { ComponentPropsWithoutRef } from 'react';

export interface SkeletonProps
  extends SkeletonVariants,
    Omit<ComponentPropsWithoutRef<'div'>, 'className' | 'style'> {
  size?: string;
  width?: string | number;
  height?: string | number;
  children?: React.ReactNode;
}
