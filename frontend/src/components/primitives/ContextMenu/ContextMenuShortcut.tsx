import { cn } from '@src/lib/utils';

import type { ContextMenuShortcutProps } from './ContextMenuShortcut.interface';

/** ContextMenuShortcut – Keyboard shortcut badge inside a menu item. */
export default function ContextMenuShortcut({ children, ...domProps }: ContextMenuShortcutProps) {
  return (
    <span
      data-slot="context-menu-shortcut"
      className={cn(
        'ml-auto text-xs tracking-widest text-muted-foreground',
        'group-focus/context-menu-item:text-accent-foreground',
      )}
      {...domProps}
    >
      {children}
    </span>
  );
}
