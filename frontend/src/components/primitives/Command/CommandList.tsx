import { Command as CommandPrimitive } from 'cmdk';

import { cn } from '@src/lib/utils';

import { commandListVariants } from './CommandList.variants';

import type { CommandListProps } from './CommandList.interface';

/** CommandList – Scrollable container for CommandItems. */
export default function CommandList({ children, ...domProps }: CommandListProps) {
  return (
    <CommandPrimitive.List
      data-slot="command-list"
      className={cn(commandListVariants())}
      {...domProps}
    >
      {children}
    </CommandPrimitive.List>
  );
}
