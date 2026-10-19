import type { BlockquoteVariants } from './Blockquote.variants';
import type { ComponentPropsWithoutRef } from 'react';

export interface BlockquoteProps
  extends BlockquoteVariants,
    Omit<ComponentPropsWithoutRef<'blockquote'>, 'className' | 'style'> {
  cite?: string;
  children?: React.ReactNode;
}
