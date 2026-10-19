import { cn } from '@src/lib/utils';

import { aspectRatioVariants } from './AspectRatio.variants';

import type { AspectRatioProps } from './AspectRatio.interface';

/**
 * AspectRatio – Container that maintains a fixed aspect ratio.
 */
export default function AspectRatio({ ratio, ...domProps }: AspectRatioProps) {
  return (
    <div
      data-slot="aspect-ratio"
      style={{ '--ratio': ratio } as React.CSSProperties}
      className={cn(aspectRatioVariants(), 'aspect-(--ratio)')}
      {...domProps}
    />
  );
}
