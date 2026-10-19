import { forwardRef } from 'react';

import { cn } from '@src/lib/utils';

import { textareaVariants } from './Textarea.variants';

import type { TextareaProps } from './Textarea.interface';

/**
 * Textarea – Multi-line text input with label support.
 */
export default forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea({
  label,
  resize = 'vertical',
  id,
  ...domProps
}, ref) {
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label className="text-sm font-medium" htmlFor={id}>
          {label}
        </label>
      )}
      <textarea
        ref={ref}
        id={id}
        data-slot="textarea"
        className={cn(textareaVariants({ resize }), 'field-sizing-content min-h-16')}
        {...domProps}
      />
    </div>
  );
});
