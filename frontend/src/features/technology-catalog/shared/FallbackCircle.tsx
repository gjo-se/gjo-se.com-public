import { getColorBg } from '@src/lib/colorTokens';
import { cn } from '@src/lib/utils';

import { FALLBACK_INITIAL } from './variants';

interface FallbackCircleProps {
  colorToken: string;
  initial: string;
  title: string;
}

/** Colored-initial circle shown when a technology has no (loadable) icon. */
export default function FallbackCircle({ colorToken, initial, title }: FallbackCircleProps) {
  const bgClass = getColorBg(colorToken || 'gray');
  return (
    <div
      className={cn('size-8 rounded-full flex items-center justify-center shrink-0', bgClass)}
      title={title}
    >
      <div className={FALLBACK_INITIAL}>{initial}</div>
    </div>
  );
}
