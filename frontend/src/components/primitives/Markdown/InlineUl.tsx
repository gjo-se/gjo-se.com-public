import type { ComponentPropsWithoutRef } from 'react';

/** Renders unordered-list as inline span. */
export function InlineUl({ children }: ComponentPropsWithoutRef<'ul'>) {
  return <span className="inline">{children}</span>;
}
