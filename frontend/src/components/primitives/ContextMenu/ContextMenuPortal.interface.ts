import type { ComponentPropsWithoutRef } from 'react';
export interface ContextMenuPortalProps extends Omit<ComponentPropsWithoutRef<'div'>, 'className' | 'style'> { children?: React.ReactNode; }
