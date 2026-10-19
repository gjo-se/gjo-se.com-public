import { createContext, useMemo } from 'react';
import { useLocation } from 'react-router';

import { useLanguage } from '@src/contexts/LanguageContext';
import { localePathname } from '@src/lib/locale';
import { labelByPath } from '@src/router.derived';

export interface BreadcrumbItem {
  label: string;
  to?: string;
}

/** Liefert das Label eines Pfads in der aktiven Sprache (DE=label, EN=labelEn). */
function localeLabelFor(meta: { label: string; labelEn?: string } | undefined, lang: 'de' | 'en', fallback: string): string {
  if (!meta) return fallback;
  return lang === 'en' ? (meta.labelEn ?? meta.label) : meta.label;
}

/**
 * Context für den dynamischen Titel des letzten Breadcrumb-Segments.
 * Seiten wie PortfolioDetailPage setzen hier den via API geladenen Titel.
 */
export function useBreadcrumbs(tail?: string | null): BreadcrumbItem[] {
  const { pathname } = useLocation();
  const { lang } = useLanguage();

  return useMemo(() => {
    // Sprach-Präfix abziehen – Labels/SSOT sind DE-basiert, Links werden EN-Slug-konform.
    const isEn = pathname.startsWith('/en');
    const relative = isEn ? pathname.replace(/^\/en/, '') || '/' : pathname;

    // Exakter Pfad-Match: noBreadcrumb → kein Breadcrumb
    const exact = labelByPath[relative];
    if (exact && 'noBreadcrumb' in exact) return [];

    const segments = relative.split('/').filter(Boolean);
    if (segments.length === 0) return [];

    const items: BreadcrumbItem[] = [
      { label: localeLabelFor(labelByPath['/'], lang, 'Home'), to: isEn ? '/en' : '/' },
    ];

    for (let i = 0; i < segments.length; i++) {
      const isLast = i === segments.length - 1;
      const path = '/' + segments.slice(0, i + 1).join('/');
      const meta = labelByPath[path];
      const label = isLast && tail ? tail : localeLabelFor(meta, lang, segments[i]);
      const to = isLast ? undefined : (isEn ? localePathname(path, 'en') : path);

      items.push({ label, ...(to ? { to } : {}) });
    }

    return items;
  }, [pathname, tail, lang]);
}

/**
 * Erzeugt Breadcrumb-Items aus dem aktuellen Pfad und meta.
 * `tail` = optionaler dynamischer Titel für das letzte Segment (z.B. Projektname).
 */
export const BreadcrumbTailContext = createContext<((label: string) => void) | null>(null);
