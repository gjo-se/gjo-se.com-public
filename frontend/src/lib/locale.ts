import { matchPath } from 'react-router';

import type { Language } from '@src/contexts/LanguageContext';
import { routeConfig } from '@src/router.config';
import type { RouteTarget } from '@src/router.derived';

type LocaleEntry = (typeof routeConfig)[keyof typeof routeConfig] & { en: string };

/** Substitutes dynamic params (e.g. :slug) into a target path template. */
function fillParams(template: string, params: Record<string, string | undefined>): string {
  return template.replace(/:([A-Za-z0-9_]+)/g, (_, key) => params[key] ?? `:${key}`);
}

/**
 * Returns the navigation/footer label for the given language.
 * DE uses `label`, EN uses `labelEn` (falls back to `label` when unset).
 */
export function localeLabel(target: RouteTarget, lang: Language): string {
  return lang === 'en' ? (target.labelEn ?? target.label) : target.label;
}

/**
 * Returns the language-specific path for a route target.
 * DE uses `path`, EN uses `en` (falls back to `path` when unset).
 */
export function localePath(target: RouteTarget, lang: Language): string {
  return lang === 'en' ? (target.en ?? target.path) : target.path;
}

/**
 * Maps an arbitrary pathname (e.g. `/portfolio/:slug` resolved to a concrete
 * `/portfolio/foo`) to the target-language path using language-specific EN slugs
 * (SSOT from routeConfig). Dynamic params are preserved.
 */
export function localePathname(pathname: string, lang: Language): string {
  const isEn = pathname.startsWith('/en');
  if ((lang === 'en' && isEn) || (lang === 'de' && !isEn)) return pathname;

  const entries = Object.values(routeConfig).filter(
    (e): e is LocaleEntry => 'en' in e,
  );

  if (lang === 'en') {
    // DE → EN: find the DE route matching the current path and swap to its EN slug.
    const found = entries
      .map((e) => ({ e, m: matchPath(e.path, pathname) }))
      .find((x): x is { e: LocaleEntry; m: NonNullable<ReturnType<typeof matchPath>> } => x.m !== null);
    if (found) return fillParams(found.e.en, found.m.params);
    return `/en${pathname === '/' ? '' : pathname}`;
  }

  // EN → DE: find the EN slug matching the current path and swap to its DE route.
  const found = entries
    .map((e) => ({ e, m: matchPath(e.en, pathname) }))
    .find((x): x is { e: LocaleEntry; m: NonNullable<ReturnType<typeof matchPath>> } => x.m !== null);
  if (found) return fillParams(found.e.path, found.m.params);
  return pathname.replace(/^\/en/, '') || '/';
}
