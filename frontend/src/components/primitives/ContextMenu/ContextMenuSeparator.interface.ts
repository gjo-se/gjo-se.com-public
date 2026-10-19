import type { ComponentPropsWithoutRef } from 'react';
export interface ContextMenuSeparatorProps extends Omit<ComponentPropsWithoutRef<'div'>, 'className' | 'style'> { children?: React.ReactNode; }
