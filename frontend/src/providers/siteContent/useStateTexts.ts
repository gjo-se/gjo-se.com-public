import { useLanguage } from '@src/contexts/LanguageContext';
import { useContent } from '@src/providers/siteContent/useContent';

/** Gemeinsame Texte für Lade-/Fehler-/Leerzustände (eine Quelle für alle Seiten). */
export interface StateTexts {
  loading: string;
  errorTitle: string;
  errorDescription: string;
  errorRetry: string;
  empty: string;
}

const FALLBACKS: StateTexts = {
  loading: 'Laden…',
  errorTitle: 'Ladefehler',
  errorDescription: 'Inhalte konnten nicht geladen werden. Bitte später erneut versuchen.',
  errorRetry: 'Erneut versuchen',
  empty: 'Keine Inhalte verfügbar.',
};

/**
 * useStateTexts – liefert die geteilten Zustands-Texte aus den Content-Keys
 * `global.state.*` (DB, DE/EN) mit deutschem Fallback. Chrome-Texte, keine Inhalte.
 */
export function useStateTexts(): StateTexts {
  const { lang } = useLanguage();
  const { data: content } = useContent(lang);

  return {
    loading: content['global.state.loading'] ?? FALLBACKS.loading,
    errorTitle: content['global.state.error.title'] ?? FALLBACKS.errorTitle,
    errorDescription: content['global.state.error.description'] ?? FALLBACKS.errorDescription,
    errorRetry: content['global.state.error.retry'] ?? FALLBACKS.errorRetry,
    empty: content['global.state.empty'] ?? FALLBACKS.empty,
  };
}
