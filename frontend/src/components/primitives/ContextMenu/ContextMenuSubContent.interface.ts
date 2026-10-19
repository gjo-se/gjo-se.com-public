import type { ComponentPropsWithoutRef } from 'react';
export interface ContextMenuSubContentProps extends Omit<ComponentPropsWithoutRef<'div'>, 'className' | 'style'> { children?: React.ReactNode; }
