import type { InputOTPVariants } from './InputOTP.variants';

export interface InputOTPProps extends Omit<InputOTPVariants, 'className' | 'style'> {
  maxLength: number;
  containerClassName?: string;
  value?: string;
  onChange?: (value: string) => void;
  onComplete?: (value: string) => void;
  disabled?: boolean;
  textAlign?: 'center' | 'left' | 'right';
  children: React.ReactNode;
}
