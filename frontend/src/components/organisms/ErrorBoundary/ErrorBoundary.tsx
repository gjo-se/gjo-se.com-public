import { ErrorBoundary as ReactErrorBoundary } from 'react-error-boundary';

import Button from '@src/components/primitives/Button';
import Text from '@src/components/primitives/Text';
import { sendMetric } from '@src/providers/rum/performance';

import { errorBoundaryFallbackVariants } from './ErrorBoundary.variants';

export type { ErrorBoundaryVariants } from './ErrorBoundary.variants';

export interface ErrorBoundaryProps {
  fallback?: React.ReactNode
  children: React.ReactNode
}

/**
 * ErrorBoundary – Catches render errors in child components.
 * Wraps react-error-boundary with project-specific default fallback.
 * Reports caught errors to the RUM endpoint via ``sendMetric``.
 *
 * @example
 * <ErrorBoundary fallback={<p>Etwas ist schiefgelaufen.</p>}>
 *   <MyComponent />
 * </ErrorBoundary>
 */
export default function ErrorBoundary({ fallback, children }: ErrorBoundaryProps) {
  return (
    <ReactErrorBoundary
      fallbackRender={fallback ? () => fallback : renderDefaultFallback}
      onError={(error, info) => {
        reportErrorToRum(error instanceof Error ? error : new Error(String(error)), info.componentStack ?? undefined);
      }}
    >
      {children}
    </ReactErrorBoundary>
  );
}

/** Default-Fallback-Renderer (rotes Fehler-Panel) – nach der Component (Composition-Kanon). */
function renderDefaultFallback({ error }: { error: unknown; resetErrorBoundary: () => void }) {
  return (
    <div className={errorBoundaryFallbackVariants()}>
      <Text variant="subtitle" weight="semibold" color="error">
        Etwas ist schiefgelaufen
      </Text>
      <Text variant="body" size="sm" color="error">
        {error instanceof Error ? error.message : 'Unbekannter Fehler'}
      </Text>
      <Button variant="secondary" size="sm" onClick={() => window.location.reload()}>
        Neu laden
      </Button>
    </div>
  );
}

function reportErrorToRum(error: Error, componentStack?: string): void {
  sendMetric({
    type: 'error',
    name: error.message,
    value: 0,
    page: window.location.pathname,
    ts: new Date().toISOString(),
    ctx: {
      stack: error.stack || null,
      ...(componentStack ? { componentStack: componentStack.trim() } : {}),
    },
  });
}
