/**
 * useDebounce – delays value propagation by `delay` ms (default 300).
 *
 * Single shared implementation for all debounce consumers (pickers, toolbars).
 */

import { useEffect, useState } from 'react';

/** Returns a debounced copy of `value`, updated `delay` ms after the last change. */
export function useDebounce<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}
