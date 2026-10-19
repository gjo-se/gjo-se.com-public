import { useCallback, useState } from 'react';

const STORAGE_KEY = 'gjo-cookie-consent';

function readStoredNotice(): boolean | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    // Legacy-Werte (vor der Umstellung auf einen reinen Hinweis) gelten als gesehen.
    if (stored === 'accepted' || stored === 'declined') return true;
  } catch {
    // localStorage not available (SSR or privacy mode)
  }
  return null;
}

/**
 * useCookieConsent – merkt lokal, ob der Cookie-Hinweis bestätigt wurde.
 *
 * Es wird **keine Einwilligung** erhoben (es existiert nichts Einwilligungspflichtiges:
 * nur technisch notwendige Speicherung). Der Hinweis informiert und wird nach
 * Bestätigung ausgeblendet; der Status liegt in `localStorage`.
 */
export function useCookieConsent() {
  const [seen, setSeen] = useState<boolean | null>(readStoredNotice);

  const dismiss = useCallback(() => {
    writeNoticeSeen();
    setSeen(true);
  }, []);

  return { isVisible: seen === null, onDismiss: dismiss };
}

function writeNoticeSeen(): void {
  try {
    localStorage.setItem(STORAGE_KEY, 'accepted');
  } catch {
    // silently ignore
  }
}
