import type { MessageScrollerButtonVariants } from './MessageScrollerButton.variants';
export interface MessageScrollerButtonProps extends Omit<MessageScrollerButtonVariants, 'className' | 'style'> {
  direction?: 'start' | 'end';
  variant?: string;
  size?: string;
  children?: React.ReactNode;
  [key: string]: unknown;
}
