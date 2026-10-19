import { useEffect } from 'react';

import { sendMetric } from '@src/providers/rum/performance';

function reportError(error: Error): void {
  sendMetric({
    type: 'error',
    name: error.message,
    value: 0,
    page: window.location.pathname,
    ts: new Date().toISOString(),
    ctx: {
      stack: error.stack || null,
    },
  });
}

/**
 * Reports uncaught JS errors and unhandled Promise rejections to the
 * RUM endpoint via ``sendMetric``. Errors already caught by an
 * ``ErrorBoundary`` do not reach the global handler (React 16+ behavior),
 * so there is no double-reporting.
 */
export function useErrorReporter(): void {
  useEffect(() => {
    function handleError(event: ErrorEvent): void {
      const error = event.error instanceof Error ? event.error : new Error(event.message);
      reportError(error);
    }

    function handleRejection(event: PromiseRejectionEvent): void {
      const reason = event.reason;
      const error = reason instanceof Error ? reason : new Error(String(reason));
      reportError(error);
    }

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleRejection);
    };
  }, []);
}
