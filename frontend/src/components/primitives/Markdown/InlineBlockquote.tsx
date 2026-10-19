import type { ComponentPropsWithoutRef } from 'react';

/** Renders blockquote content as italic. */
export function InlineBlockquote({ children }: ComponentPropsWithoutRef<'blockquote'>) {
  return <em>{children}</em>;
}
