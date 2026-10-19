import type { ColorPickerVariants } from './ColorPicker.variants';

export interface ColorPickerProps extends Omit<ColorPickerVariants, 'className' | 'style'> {
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  label?: string;
  id?: string;
  fullWidth?: boolean;
}
