import type { ToastVariants } from './Toast.variants';
import type { ToasterProps } from 'sonner';

export interface ToastProps
  extends Omit<ToastVariants, 'className' | 'style'>,
    Omit<ToasterProps, 'className' | 'style'> {
  children?: React.ReactNode;
}
