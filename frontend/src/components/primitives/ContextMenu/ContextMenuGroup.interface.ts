import type { ComponentPropsWithoutRef } from 'react';
export interface ContextMenuGroupProps extends Omit<ComponentPropsWithoutRef<'div'>, 'className' | 'style'> { children?: React.ReactNode; }
