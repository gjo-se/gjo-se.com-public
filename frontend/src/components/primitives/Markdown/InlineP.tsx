import type { ComponentPropsWithoutRef } from 'react';

/** Renders paragraph as plain children (no wrapper). */
export function InlineP({ children }: ComponentPropsWithoutRef<'p'>) {
  return children;
}
