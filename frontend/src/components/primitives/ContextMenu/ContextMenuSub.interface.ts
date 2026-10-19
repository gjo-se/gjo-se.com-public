import type { ComponentPropsWithoutRef } from 'react';
export interface ContextMenuSubProps extends Omit<ComponentPropsWithoutRef<'div'>, 'className' | 'style'> { children?: React.ReactNode; }
