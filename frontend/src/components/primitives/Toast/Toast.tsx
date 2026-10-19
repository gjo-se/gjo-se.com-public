import { useTheme } from 'next-themes';
import { Toaster as Sonner, type ToasterProps as SonnerProps } from 'sonner';

import Icon from '@src/components/primitives/Icon/Icon';

import { toastVariants } from './Toast.variants';

import type { ToastProps } from './Toast.interface';

/**
 * Toast – Global toast notification system via sonner.
 * Mount once in the app root. Use `toast()` from 'sonner' to trigger toasts.
 */
export default function Toast({ ...domProps }: ToastProps) {
  const { theme = 'system' } = useTheme();

  return (
    <Sonner
      theme={theme as SonnerProps['theme']}
      className={toastVariants()}
      icons={{
        success: <Icon name="check-circle" size="sm" aria-hidden />,
        info: <Icon name="info" size="sm" aria-hidden />,
        warning: <Icon name="alert-triangle" size="sm" aria-hidden />,
        error: <Icon name="x-circle" size="sm" aria-hidden />,
        loading: <Icon name="loader-2" size="sm" aria-hidden />,
      }}
      toastOptions={{
        classNames: {
          toast: 'cn-toast',
          error: '!bg-destructive-subtle-bg !text-destructive-subtle-text !border-destructive-subtle-border',
          success: '!bg-success-subtle-bg !text-success-subtle-text !border-success-subtle-border',
          warning: '!bg-warning-subtle-bg !text-warning-subtle-text !border-warning-ring',
          info: '!bg-info-subtle-bg !text-info-subtle-text !border-info-subtle-border',
        },
      }}
      {...domProps}
    />
  );
}
