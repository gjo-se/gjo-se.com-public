import { useSyncExternalStore } from 'react';

/** SSR snapshot – light is the safe default. */
function getServerSnapshot(): string {
  return 'light';
}

/** Returns 'dark' | 'light' from the `.dark` class on `document.documentElement`. */
function getSnapshot(): string {
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
}

function subscribe(callback: () => void): () => void {
  const observer = new MutationObserver(callback);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['class'],
  });
  return () => observer.disconnect();
}

/**
 * Observes the theme class on `<html>` independently of any `useDarkMode` instance,
 * so every chart on a page re-renders when the theme toggles.
 */
export function useThemeClass(): string {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
