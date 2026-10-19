import { RadioGroup as RadioGroupPrimitive } from '@base-ui/react/radio-group';

import { cn } from '@src/lib/utils';

import { radioGroupVariants } from './RadioGroup.variants';

import type { RadioGroupProps } from './RadioGroup.interface';

/**
 * RadioGroup – Mutually exclusive option selection.
 */
export default function RadioGroup({
  value,
  defaultValue,
  onValueChange,
  orientation = 'vertical',
  ...domProps
}: RadioGroupProps) {
  return (
    <RadioGroupPrimitive
      value={value}
      defaultValue={defaultValue}
      onValueChange={onValueChange}
      className={cn(radioGroupVariants({ orientation }))}
      {...domProps}
    />
  );
}
