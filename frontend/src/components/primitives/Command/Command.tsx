import { Command as CommandPrimitive } from 'cmdk';

import { cn } from '@src/lib/utils';

import { commandVariants } from './Command.variants';

import type { CommandProps } from './Command.interface';

/**
 * Command – Fast command palette with search and keyboard navigation.
 */
export default function Command({ children, ...props }: CommandProps) {
  return (
    <CommandPrimitive data-slot="command" className={cn(commandVariants())} {...props}>
      {children}
    </CommandPrimitive>
  );
}
