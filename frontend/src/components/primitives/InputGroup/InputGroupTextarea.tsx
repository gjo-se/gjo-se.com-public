import { Textarea as ShadcnTextarea } from '@src/components/vendor/shadcn/textarea';
import { cn } from '@src/lib/utils';

import { inputGroupTextareaVariants } from './InputGroupTextarea.variants';

import type { InputGroupTextareaProps } from './InputGroupTextarea.interface';

/**
 * InputGroupTextarea – Styled textarea inside an InputGroup. Borders removed for seamless integration.
 */
export default function InputGroupTextarea({ ...domProps }: InputGroupTextareaProps) {
  return (
    <ShadcnTextarea
      data-slot="input-group-control"
      className={cn(inputGroupTextareaVariants())}
      {...domProps}
    />
  );
}
