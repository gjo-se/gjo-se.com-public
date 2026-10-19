import { MessageScroller as MessageScrollerPrimitive } from '@shadcn/react/message-scroller';

import type { MessageScrollerProviderProps } from './MessageScrollerProvider.interface';

/**
 *
 */
export default function MessageScrollerProvider(props: MessageScrollerProviderProps & Record<string, unknown>) {
  return <MessageScrollerPrimitive.Provider {...(props as Record<string, unknown>)} />;
}
