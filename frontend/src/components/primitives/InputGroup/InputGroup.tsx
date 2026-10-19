import { cn } from '@src/lib/utils';

import { inputGroupVariants } from './InputGroup.variants';

import type { InputGroupProps } from './InputGroup.interface';

/**
 * InputGroup – Composite input container with addon/button slots.
 */
export default function InputGroup({ children, ...domProps }: InputGroupProps) {
  return (
    <div
      data-slot="input-group"
      role="group"
      className={cn(inputGroupVariants())}
      {...domProps}
    >
      {children}
    </div>
  );
}
