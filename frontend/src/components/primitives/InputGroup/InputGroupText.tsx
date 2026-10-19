import { cn } from '@src/lib/utils';

import { inputGroupTextVariants } from './InputGroupText.variants';

import type { InputGroupTextProps } from './InputGroupText.interface';

/**
 * InputGroupText – Static text label inside an InputGroup.
 */
export default function InputGroupText({ children, ...domProps }: InputGroupTextProps) {
  return (
    <span className={cn(inputGroupTextVariants())} {...domProps}>
      {children}
    </span>
  );
}
