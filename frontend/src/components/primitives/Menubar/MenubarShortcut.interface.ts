import type { MenubarShortcutVariants } from './MenubarShortcut.variants';
import type { ComponentPropsWithoutRef } from 'react';

export interface MenubarShortcutProps
  extends MenubarShortcutVariants,
    Omit<ComponentPropsWithoutRef<'span'>, 'className' | 'style'> {
  children?: React.ReactNode;
}
