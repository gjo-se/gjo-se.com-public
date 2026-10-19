import type { ComponentPropsWithoutRef } from 'react';

/** Renders ordered-list as inline span. */
export function InlineOl({ children }: ComponentPropsWithoutRef<'ol'>) {
  return <span className="inline">{children}</span>;
}
