import { useLocation } from 'react-router';

export type Language = 'de' | 'en';

/**
 * useLanguage – the current language is derived from the URL (single source of truth).
 * A path starting with `/en` means English, everything else German.
 */
export function useLanguage(): { lang: Language } {
  const { pathname } = useLocation();
  const lang: Language = pathname.startsWith('/en') ? 'en' : 'de';
  return { lang };
}
