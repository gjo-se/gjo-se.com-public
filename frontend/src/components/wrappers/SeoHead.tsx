import { Helmet } from 'react-helmet-async';
import { useLocation } from 'react-router';

import PageSeoHead, { type PageSeoKey } from '@src/components/wrappers/PageSeoHead';
import { useLanguage } from '@src/contexts/LanguageContext';
import { localePathname } from '@src/lib/locale';

/** Produktions-Origin für canonical/hreflang. Kanonischer Host ist www (Apex → 301 → www). */
const SITE_ORIGIN = import.meta.env.VITE_SITE_URL ?? 'https://www.gjo-se.com';

/**
 * SeoHead – setzt pro Route die SEO-Head-Tags:
 *  - <html lang>, canonical und hreflang-Alternates (de / en / x-default) aus der URL (URL-SSOT).
 *  - <title> + Meta-Description für öffentliche Marketing-Seiten aus den Content-Keys
 *    (`${page}.seo.title` / `${page}.seo.description`, DE/EN) via PageSeoHead –
 *    inklusive eigener Keys je Focus-Detailseite (`focus.<slug>.seo.*`).
 * Nur für abgedeckte Public-Seiten wird Content geladen (kein Fetch auf Admin/Auth).
 */
export default function SeoHead() {
  const { pathname } = useLocation();
  const { lang } = useLanguage();

  // Aktuelle URL ohne Trailing-Slash (Root bleibt "/").
  const canonicalPath = pathname === '/' ? '/' : pathname.replace(/\/+$/, '');
  const canonicalUrl = `${SITE_ORIGIN}${canonicalPath}`;

  const deUrl = `${SITE_ORIGIN}${lang === 'de' ? canonicalPath : localePathname(canonicalPath, 'de')}`;
  const enUrl = `${SITE_ORIGIN}${lang === 'en' ? canonicalPath : localePathname(canonicalPath, 'en')}`;

  // Lokaler Pfad (EN-Präfix entfernt) fürs Seiten-Mapping.
  const localPath = lang === 'en' ? canonicalPath.replace(/^\/en/, '') || '/' : canonicalPath;
  const pageKey = seoPageKey(localPath);

  return (
    <>
      <Helmet>
        <html lang={lang} />
        <link rel="canonical" href={canonicalUrl} />
        <link rel="alternate" hrefLang="de" href={deUrl} />
        <link rel="alternate" hrefLang="en" href={enUrl} />
        <link rel="alternate" hrefLang="x-default" href={deUrl} />
      </Helmet>
      {pageKey ? <PageSeoHead pageKey={pageKey} lang={lang} /> : null}
    </>
  );
}

/** Focus-Detailseiten: Slug aus der URL → eigener SEO-Seiten-Schlüssel. */
const FOCUS_DETAIL_SEO: Record<string, PageSeoKey> = {
  ai: 'focusAi',
  architecture: 'focusArchitecture',
  'clean-code': 'focusCleanCode',
};

/** Pfad (ohne Locale-Präfix) → SEO-Seiten-Schlüssel; null für nicht abgedeckte Seiten. */
function seoPageKey(localPath: string): PageSeoKey | null {
  if (localPath === '/') return 'home';
  const segments = localPath.split('/');
  const first = segments[1];
  if (first === 'focus') {
    const detail = segments[2] ? FOCUS_DETAIL_SEO[segments[2]] : undefined;
    return detail ?? 'focus';
  }
  if (first === 'skills') return 'skills';
  if (first === 'about') return 'about';
  if (first === 'contact') return 'contact';
  if (first === 'imprint') return 'imprint';
  if (first === 'privacy') return 'privacy';
  return null;
}
