import { cn } from '@src/lib/utils';

import { commandShortcutVariants } from './CommandShortcut.variants';

import type { CommandShortcutProps } from './CommandShortcut.interface';

/** CommandShortcut – Keyboard shortcut badge inside a CommandItem. */
export default function CommandShortcut({ children, ...domProps }: CommandShortcutProps) {
  return (
    <span
      data-slot="command-shortcut"
      className={cn(commandShortcutVariants())}
      {...domProps}
    >
      {children}
    </span>
  );
}
