import { Checkbox as CheckboxPrimitive } from '@base-ui/react/checkbox';
import { useEffect, useRef } from 'react';

import { cn } from '@src/lib/utils';

import { checkboxVariants } from './Checkbox.variants';

import type { CheckboxProps } from './Checkbox.interface';

/**
 * Checkbox – Toggle input with label support.
 */
export default function Checkbox({
  checked,
  onChange,
  label,
  indeterminate = false,
  disabled,
  size = 'default',
  id,
  ...domProps
}: CheckboxProps) {
  const ref = useRef<HTMLButtonElement>(null);
  const checkboxId = id ?? label?.toLowerCase().replace(/\s+/g, '-');

  useEffect(() => {
    if (ref.current) {
      ref.current.setAttribute('data-indeterminate', String(indeterminate));
    }
  }, [indeterminate]);

  return (
    <div className="flex items-center gap-2">
      <CheckboxPrimitive.Root
        ref={ref}
        id={checkboxId}
        checked={checked}
        onCheckedChange={(c) => onChange(Boolean(c))}
        disabled={disabled}
        className={cn(checkboxVariants({ size }))}
        {...domProps}
      >
        <CheckboxPrimitive.Indicator>
          <svg
            className="size-full"
            viewBox="0 0 15 15"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M11.4669 3.72684C11.7558 3.91574 11.8369 4.30308 11.648 4.59198L7.39799 11.092C7.29783 11.2452 7.13556 11.3467 6.95402 11.3699C6.77247 11.3931 6.58989 11.3355 6.45446 11.2124L3.70446 8.71241C3.44905 8.48022 3.43023 8.08494 3.66242 7.82953C3.89461 7.57412 4.28989 7.55529 4.5453 7.78749L6.75292 9.79441L10.6018 3.90792C10.7907 3.61902 11.178 3.53795 11.4669 3.72684Z"
              fill="currentColor"
              fillRule="evenodd"
              clipRule="evenodd"
            />
          </svg>
        </CheckboxPrimitive.Indicator>
      </CheckboxPrimitive.Root>
      {label && (
        <label
          htmlFor={checkboxId}
          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-50"
        >
          {label}
        </label>
      )}
    </div>
  );
}
