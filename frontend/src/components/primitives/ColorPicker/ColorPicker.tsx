import { ColorPicker as MantineColorPicker } from '@mantine/core';

import { cn } from '@src/lib/utils';

import { colorPickerVariants } from './ColorPicker.variants';

import type { ColorPickerProps } from './ColorPicker.interface';

/**
 * ColorPicker – Mantine-based color picker with label and fullWidth support.
 */
export default function ColorPicker({
  value,
  defaultValue = '#000000',
  onChange,
  label,
  id,
  fullWidth,
  ...domProps
}: ColorPickerProps) {
  return (
    <div className={cn(colorPickerVariants())} {...domProps}>
      {label && (
        <label htmlFor={id} className="block text-sm font-medium text-on-surface-secondary mb-1">
          {label}
        </label>
      )}
      <MantineColorPicker
        id={id}
        value={value}
        defaultValue={defaultValue}
        onChange={onChange}
        fullWidth={fullWidth}
      />
    </div>
  );
}
