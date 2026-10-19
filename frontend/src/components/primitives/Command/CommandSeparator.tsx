import { Command as CommandPrimitive } from 'cmdk';

import { cn } from '@src/lib/utils';

import { commandSeparatorVariants } from './CommandSeparator.variants';

import type { CommandSeparatorProps } from './CommandSeparator.interface';

/** CommandSeparator – Horizontal divider between CommandGroups. */
export default function CommandSeparator({ ...domProps }: CommandSeparatorProps) {
  return (
    <CommandPrimitive.Separator
      data-slot="command-separator"
      className={cn(commandSeparatorVariants())}
      {...domProps}
    />
  );
}
