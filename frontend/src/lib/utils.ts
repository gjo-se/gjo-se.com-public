import { clsx, type ClassValue } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

/**
 * Tailwind-merge kennt projektspezifische Font-Size-Tokens nicht.
 * Ohne Registrierung wird ein Token wie text-nav als Textfarbe eingeordnet und
 * beim Mergen gegen eine Farbe wie text-on-surface verworfen. Deshalb sind hier
 * alle text-Tokens aus index.css als font-size registriert, inklusive der
 * projekt-eigenen Skalen (nav, sos, 1xs …).
 */
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      'font-size': [
        {
          text: [
            'display-sm',
            'display-md',
            'display-lg',
            'nav',
            'nav-sm',
            'nav-lg',
            'sos',
            '1xs',
            '2xs',
            '3xs',
          ],
        },
      ],
    },
  },
});

/** Merges conditional class names and resolves Tailwind conflicts. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Parses a JSON string safely, returning the fallback on failure. */
export function safeJsonParse<T>(str: string, fallback: T): T {
  try { return JSON.parse(str) as T; } catch { return fallback; }
}
