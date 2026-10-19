import { cn } from '@src/lib/utils';

import { audioVariants } from './Audio.variants';

import type { AudioProps } from './Audio.interface';

/**
 * Audio – Native HTML audio player with controls.
 */
export default function Audio({ children, ...domProps }: AudioProps) {
  return (
    <audio
      className={cn(audioVariants())}
      {...domProps}
    >
      {children}
    </audio>
  );
}
