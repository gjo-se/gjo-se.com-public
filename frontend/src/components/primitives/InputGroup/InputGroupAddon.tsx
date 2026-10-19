import { cn } from '@src/lib/utils';

import { inputGroupAddonVariants } from './InputGroupAddon.variants';

import type { InputGroupAddonProps } from './InputGroupAddon.interface';

/**
 * InputGroupAddon – Prefix/suffix slot inside an InputGroup. Clicking focuses the nearest input.
 */
export default function InputGroupAddon({ align = 'inline-start', children, ...domProps }: InputGroupAddonProps) {
  return (
    <div
      role="group"
      data-slot="input-group-addon"
      data-align={align}
      className={cn(inputGroupAddonVariants({ align }))}
      onClick={(e) => {
        if ((e.target as HTMLElement).closest('button')) return;
        e.currentTarget.parentElement?.querySelector('input')?.focus();
      }}
      {...domProps}
    >
      {children}
    </div>
  );
}
