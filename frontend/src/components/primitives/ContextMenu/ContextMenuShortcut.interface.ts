import type { ComponentPropsWithoutRef } from 'react';
export interface ContextMenuShortcutProps extends Omit<ComponentPropsWithoutRef<'span'>, 'className' | 'style'> { children?: React.ReactNode; }
