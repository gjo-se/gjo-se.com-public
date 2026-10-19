import { cn } from '@src/lib/utils';

import type { VideoProps } from './Video.interface';

/**
 * Video – Semantic HTML video player with standard controls.
 */
export default function Video({
  controls = true,
  ...domProps
}: VideoProps) {
  return (
    <video
      controls={controls}
      className={cn('w-full rounded-lg')}
      {...domProps}
    />
  );
}
