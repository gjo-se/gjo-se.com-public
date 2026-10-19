import { Input as ShadcnInput } from '@src/components/vendor/shadcn/input';
import { cn } from '@src/lib/utils';

import { inputGroupInputVariants } from './InputGroupInput.variants';

import type { InputGroupInputProps } from './InputGroupInput.interface';

/**
 * InputGroupInput – Styled input field inside an InputGroup. Borders removed for seamless integration.
 */
export default function InputGroupInput({ ...domProps }: InputGroupInputProps) {
  return (
    <ShadcnInput
      data-slot="input-group-control"
      className={cn(inputGroupInputVariants())}
      {...domProps}
    />
  );
}
