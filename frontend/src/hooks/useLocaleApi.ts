import { useLanguage } from '@src/contexts/LanguageContext';
import type { Language } from '@src/contexts/LanguageContext';

interface LocaleApi {
  locale: Language;
  withLocale: (url: string) => string;
}

/**
 * Returns the current locale and a helper to append ?locale= to API URLs.
 */
export function useLocaleApi(): LocaleApi {
  const { lang } = useLanguage();

  const withLocale = (url: string): string => {
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}locale=${lang}`;
  };

  return { locale: lang, withLocale };
}
