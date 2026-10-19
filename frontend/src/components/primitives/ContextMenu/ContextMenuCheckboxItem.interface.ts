import type { ComponentPropsWithoutRef } from 'react';
export interface ContextMenuCheckboxItemProps extends Omit<ComponentPropsWithoutRef<'div'>, 'className' | 'style'> { checked?: boolean; inset?: boolean; }
