import { DirectionProvider as DirectionProviderPrimitive } from '@base-ui/react/direction-provider';

import type { DirectionProviderProps } from './DirectionProvider.interface';

/** DirectionProvider – Sets RTL/LTR text direction for its children. */
export default function DirectionProvider({ children, ...domProps }: DirectionProviderProps) {
  return <DirectionProviderPrimitive {...domProps}>{children}</DirectionProviderPrimitive>;
}
