import { DirectionProvider as DirectionPrimitive } from '@base-ui/react/direction-provider';

import type { DirectionProps } from './Direction.interface';

/**
 * Direction – RTL/LTR direction context provider.
 */
export default function Direction({
  direction = 'ltr',
  ...domProps
}: DirectionProps) {
  return (
    <DirectionPrimitive direction={direction} {...domProps} />
  );
}
