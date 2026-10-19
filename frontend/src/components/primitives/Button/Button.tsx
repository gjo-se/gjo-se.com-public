import { Button as ButtonPrimitive } from '@base-ui/react/button';

import Icon from '@src/components/primitives/Icon/Icon';
import { cn } from '@src/lib/utils';

import { buttonVariants } from './Button.variants';

import type { ButtonProps } from './Button.interface';

/**
 * Button – Primary action trigger.
 * Supports loading, submit, and full-width states.
 */
export default function Button({
  variant = 'default',
  size = 'default',
  loading = false,
  fullWidth = false,
  submit = false,
  disabled,
  children,
  ...domProps
}: ButtonProps) {
  return (
    <ButtonPrimitive
      data-slot="button"
      type={submit ? 'submit' : 'button'}
      disabled={disabled ?? loading}
      className={cn(buttonVariants({ variant, size }), fullWidth && 'w-full')}
      {...domProps}
    >
      {loading && (
        <span className="mr-2 inline-flex animate-spin">
          <Icon name="loader-2" />
        </span>
      )}
      {children}
    </ButtonPrimitive>
  );
}
