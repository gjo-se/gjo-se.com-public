import type { ComponentPropsWithoutRef } from 'react';
export interface ContextMenuItemProps extends Omit<ComponentPropsWithoutRef<'div'>, 'className' | 'style'> { variant?: string; inset?: boolean; }
