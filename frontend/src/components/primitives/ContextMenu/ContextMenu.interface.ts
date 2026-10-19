import type { ContextMenuVariants } from './ContextMenu.variants';
import type { ComponentPropsWithoutRef } from 'react';

export interface ContextMenuProps extends ContextMenuVariants, Omit<ComponentPropsWithoutRef<'div'>, 'className' | 'style'> {
  children?: React.ReactNode;
}
