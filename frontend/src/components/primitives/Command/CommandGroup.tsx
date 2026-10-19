import { Command as CommandPrimitive } from 'cmdk';

import { cn } from '@src/lib/utils';

import { commandGroupVariants } from './CommandGroup.variants';

import type { CommandGroupProps } from './CommandGroup.interface';

/** CommandGroup – Groups related CommandItems with an optional heading. */
export default function CommandGroup({ children, ...domProps }: CommandGroupProps) {
  return (
    <CommandPrimitive.Group
      data-slot="command-group"
      className={cn(commandGroupVariants())}
      {...domProps}
    >
      {children}
    </CommandPrimitive.Group>
  );
}
