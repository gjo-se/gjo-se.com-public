import Overlay from '@src/components/primitives/Overlay';
import Spinner from '@src/components/primitives/Spinner';
import Text from '@src/components/primitives/Text';

import type { LoadingShellProps } from './LoadingShell.interface';

/**
 * LoadingShell – Loading state with centered spinner.
 * variant="shell" replaces content. variant="overlay" overlays content.
 * Optional `text` zeigt eine Beschriftung unter dem Spinner.
 */
export default function LoadingShell({ height = 'py-12', variant = 'shell', text }: LoadingShellProps) {
  if (variant === 'overlay') {
    return (
      <Overlay variant="loading">
        <Spinner />
      </Overlay>
    );
  }

  return (
    <div className={`flex flex-col items-center justify-center gap-3 ${height}`}>
      <Spinner />
      {text && (
        <Text size="sm" color="muted">
          {text}
        </Text>
      )}
    </div>
  );
}
