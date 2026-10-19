import type { ComponentPropsWithoutRef } from 'react';

export interface SidebarProps
  extends Omit<ComponentPropsWithoutRef<'div'>, 'className' | 'style'> {
  children?: React.ReactNode;
  side?: 'left' | 'right';
  variant?: 'sidebar' | 'floating' | 'inset';
  collapsible?: 'offcanvas' | 'icon' | 'none';
}
