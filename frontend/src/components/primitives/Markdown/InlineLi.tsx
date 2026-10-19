import type { ComponentPropsWithoutRef } from 'react';

/** Renders list-item as inline span with a trailing line-break. */
export function InlineLi({ children }: ComponentPropsWithoutRef<'li'>) {
  return <span className="inline">{children}<br /></span>;
}
