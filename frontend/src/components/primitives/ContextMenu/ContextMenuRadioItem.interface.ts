import type { ComponentPropsWithoutRef } from 'react';
export interface ContextMenuRadioItemProps extends Omit<ComponentPropsWithoutRef<'div'>, 'className' | 'style'> { value: string; inset?: boolean; }
