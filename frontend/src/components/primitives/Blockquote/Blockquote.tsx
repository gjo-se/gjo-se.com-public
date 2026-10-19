import { cn } from '@src/lib/utils';

import { blockquoteVariants } from './Blockquote.variants';

import type { BlockquoteProps } from './Blockquote.interface';

/**
 * Blockquote – Semantic blockquote element with citation support.
 */
export default function Blockquote({ variant = 'default', cite, children, ...domProps }: BlockquoteProps) {
  return (
    <blockquote
      cite={cite}
      className={cn(blockquoteVariants({ variant }))}
      {...domProps}
    >
      {children}
      {cite && (
        <footer className="mt-2 text-xs text-on-surface-subtle">— {cite}</footer>
      )}
    </blockquote>
  );
}
