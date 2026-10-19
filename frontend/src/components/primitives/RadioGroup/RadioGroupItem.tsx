import { Radio as RadioPrimitive } from '@base-ui/react/radio';

import { cn } from '@src/lib/utils';

import { radioGroupItemVariants } from './RadioGroupItem.variants';

import type { RadioGroupItemProps } from './RadioGroupItem.interface';

/**
 * RadioGroupItem – Single option within a RadioGroup.
 */
export default function RadioGroupItem({
  value,
  label,
  size = 'default',
  id,
  disabled,
  ...domProps
}: RadioGroupItemProps) {
  const itemId = id ?? label?.toLowerCase().replace(/\s+/g, '-');

  return (
    <div className="flex items-center gap-2">
      <RadioPrimitive.Root
        id={itemId}
        value={value}
        disabled={disabled}
        className={cn(radioGroupItemVariants({ size }))}
        {...domProps}
      >
        <RadioPrimitive.Indicator className="flex items-center justify-center">
          <span className="size-2 rounded-full bg-primary-foreground" />
        </RadioPrimitive.Indicator>
      </RadioPrimitive.Root>
      {label && (
        <label htmlFor={itemId} className="text-sm font-medium leading-none">
          {label}
        </label>
      )}
    </div>
  );
}
