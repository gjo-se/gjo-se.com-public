import { Toggle as TogglePrimitive } from '@base-ui/react/toggle';

import { cn } from '@src/lib/utils';

import { toggleVariants } from './Toggle.variants';

import type { ToggleProps } from './Toggle.interface';

/**
 * Toggle – Pressable button with pressed/unpressed states.
 */
export default function Toggle({
  variant = 'default',
  size = 'default',
  pressed,
  defaultPressed,
  onPressedChange,
  disabled,
  children,
  ...domProps
}: ToggleProps) {
  return (
    <TogglePrimitive
      data-slot="toggle"
      pressed={pressed}
      defaultPressed={defaultPressed}
      onPressedChange={onPressedChange}
      disabled={disabled}
      className={cn(toggleVariants({ variant, size }))}
      {...domProps}
    >
      {children}
    </TogglePrimitive>
  );
}
