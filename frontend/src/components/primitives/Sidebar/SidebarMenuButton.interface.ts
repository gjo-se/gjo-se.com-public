import type { ComponentPropsWithoutRef } from 'react';

export interface SidebarMenuButtonProps
  extends Omit<ComponentPropsWithoutRef<'button'>, 'className' | 'style'> {
  children?: React.ReactNode;
  isActive?: boolean;
  tooltip?: string | Record<string, unknown>;
  render?: React.ReactElement;
  size?: 'default' | 'sm' | 'lg';
  variant?: 'default' | 'outline';
}
