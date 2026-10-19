/**
 * useMountOnce – runs an async initializer exactly once after mount.
 *
 * Guards against React StrictMode's double invocation (the classic
 * `initRef` pattern). The callback fires on mount only; later identity
 * changes are ignored.
 */

import { useEffect, useRef } from 'react';

/** Invokes `callback` once on mount (StrictMode-safe). */
export function useMountOnce(callback: () => void | Promise<void>): void {
  const initRef = useRef(false);

  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;
    void callback();
  }, [callback]);
}
