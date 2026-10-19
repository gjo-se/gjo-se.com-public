import { Command as CommandPrimitive } from 'cmdk';

import Icon from '@src/components/primitives/Icon/Icon';
import { InputGroup, InputGroupAddon } from '@src/components/vendor/shadcn/input-group';
import { cn } from '@src/lib/utils';

import { commandInputVariants } from './CommandInput.variants';

import type { CommandInputProps } from './CommandInput.interface';

/** CommandInput – Search input inside a Command palette with search icon. */
export default function CommandInput({ ...domProps }: CommandInputProps) {
  return (
    <InputGroup>
      <InputGroupAddon><Icon name="search" /></InputGroupAddon>
      <CommandPrimitive.Input
        data-slot="command-input"
        className={cn(commandInputVariants())}
        {...domProps}
      />
    </InputGroup>
  );
}
