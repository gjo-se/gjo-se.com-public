import type { ComponentPropsWithoutRef } from 'react';
export interface ContextMenuContentProps extends Omit<ComponentPropsWithoutRef<'div'>, 'className' | 'style'> { sideOffset?: number; alignOffset?: number; align?: string; }
