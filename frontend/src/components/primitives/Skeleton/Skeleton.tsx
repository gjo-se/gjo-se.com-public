import { cn } from '@src/lib/utils';

import { skeletonVariants } from './Skeleton.variants';

import type { SkeletonProps } from './Skeleton.interface';

/**
 * Skeleton – Placeholder for loading content.
 */
export default function Skeleton({
  variant = 'default',
  size,
  width = size,
  height = size,
  ...domProps
}: SkeletonProps) {
  const sizeStyle: React.CSSProperties = {
    ...(width ? { width } : undefined),
    ...(height ? { height } : undefined),
  };

  return (
    <div
      data-slot="skeleton"
      className={cn(skeletonVariants({ variant }))}
      style={Object.keys(sizeStyle).length > 0 ? sizeStyle : undefined}
      {...domProps}
    />
  );
}
