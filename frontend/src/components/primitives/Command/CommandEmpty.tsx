import { Command as CommandPrimitive } from 'cmdk';

import { cn } from '@src/lib/utils';

import { commandEmptyVariants } from './CommandEmpty.variants';

import type { CommandEmptyProps } from './CommandEmpty.interface';

/** CommandEmpty – Shown when no results match the search query. */
export default function CommandEmpty({ children, ...domProps }: CommandEmptyProps) {
  return (
    <CommandPrimitive.Empty
      data-slot="command-empty"
      className={cn(commandEmptyVariants())}
      {...domProps}
    >
      {children}
    </CommandPrimitive.Empty>
  );
}
