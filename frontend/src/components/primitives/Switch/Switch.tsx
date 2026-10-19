import { Switch as SwitchPrimitive } from '@base-ui/react/switch';

import { cn } from '@src/lib/utils';

import { switchVariants } from './Switch.variants';

import type { SwitchProps } from './Switch.interface';

/**
 * Switch – On/off toggle with label support.
 */
export default function Switch({
  checked,
  onChange,
  label,
  disabled,
  size = 'default',
  id,
  ...domProps
}: SwitchProps) {
  const switchId = id ?? label?.toLowerCase().replace(/\s+/g, '-');

  return (
    <div className="flex items-center gap-2">
      <SwitchPrimitive.Root
        id={switchId}
        checked={checked}
        onCheckedChange={(c) => onChange(Boolean(c))}
        disabled={disabled}
        className={cn(switchVariants({ size }))}
        {...domProps}
      >
        <SwitchPrimitive.Thumb
          data-slot="thumb"
          className="block size-3.5 rounded-full bg-background shadow-sm ring-0 transition-transform data-checked:translate-x-3.5 data-unchecked:translate-x-0"
        />
      </SwitchPrimitive.Root>
      {label && (
        <label
          htmlFor={switchId}
          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-50"
        >
          {label}
        </label>
      )}
    </div>
  );
}
