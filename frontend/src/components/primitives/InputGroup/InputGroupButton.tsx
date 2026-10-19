import { Button as ShadcnButton } from '@src/components/vendor/shadcn/button';
import { cn } from '@src/lib/utils';

import { inputGroupButtonVariants } from './InputGroupButton.variants';

import type { InputGroupButtonProps } from './InputGroupButton.interface';

/**
 * InputGroupButton – Compact button inside an InputGroup. Supports size variants.
 */
export default function InputGroupButton({
  type = 'button',
  variant = 'ghost',
  size = 'xs',
  children,
  ...domProps
}: InputGroupButtonProps & { variant?: string }) {
  return (
    <ShadcnButton
      type={type}
      data-size={size}
      variant={variant as 'ghost' | 'default' | 'secondary' | 'destructive' | 'outline' | 'link'}
      className={cn(inputGroupButtonVariants({ size }))}
      {...domProps}
    >
      {children}
    </ShadcnButton>
  );
}
