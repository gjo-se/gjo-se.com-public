import { Input as InputPrimitive } from '@base-ui/react/input';

import { cn } from '@src/lib/utils';

import type { InputProps } from './Input.interface';

/**
 * Input – Text input with label, error state, and icon support.
 */
export default function Input({
  error,
  helperText,
  leftIcon,
  label,
  id,
  ...domProps
}: InputProps) {
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label className="text-sm font-medium" htmlFor={id}>
          {label}
        </label>
      )}
      <div className="relative">
        {leftIcon && (
          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground">
            {leftIcon}
          </span>
        )}
        <InputPrimitive
          id={id}
          data-slot="input"
          className={cn(
            'h-9 w-full min-w-0 rounded-md border border-input bg-transparent px-2.5 py-1 text-base shadow-xs transition outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40',
            error && 'border-destructive focus-visible:border-destructive',
            leftIcon && 'pl-8',
          )}
          {...domProps}
        />
      </div>
      {helperText && (
        <span
          className={cn(
            'text-xs',
            error ? 'text-destructive' : 'text-muted-foreground',
          )}
        >
          {helperText}
        </span>
      )}
    </div>
  );
}
