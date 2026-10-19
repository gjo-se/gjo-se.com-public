import type { ComponentPropsWithoutRef } from 'react';

/** Renders heading content as bold. */
export function InlineHeading({ children }: ComponentPropsWithoutRef<'h1'>) {
  return <strong>{children}</strong>;
}
