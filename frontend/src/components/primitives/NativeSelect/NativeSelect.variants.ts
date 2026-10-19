import { cva, type VariantProps } from 'class-variance-authority';
export const nativeSelectVariants = cva('group/native-select relative w-fit has-[select:disabled]:opacity-50', { variants: { size: { default: '', sm: '' } }, defaultVariants: { size: 'default' } });
export type NativeSelectVariants = VariantProps<typeof nativeSelectVariants>;
