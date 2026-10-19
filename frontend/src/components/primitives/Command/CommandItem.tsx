import { Command as CommandPrimitive } from 'cmdk';

import { cn } from '@src/lib/utils';

import { commandItemVariants } from './CommandItem.variants';

import type { CommandItemProps } from './CommandItem.interface';

/** CommandItem – Selectable item inside a Command palette. */
export default function CommandItem({ children, ...domProps }: CommandItemProps) {
  return (
    <CommandPrimitive.Item
      data-slot="command-item"
      className={cn(commandItemVariants())}
      {...domProps}
    >
      {children}
    </CommandPrimitive.Item>
  );
}
