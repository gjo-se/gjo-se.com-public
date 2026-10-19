import type { Language } from '@src/contexts/LanguageContext';
import type { SiteContentData } from '@src/lib/api/siteContent';
import { localePath } from '@src/lib/locale';
import { routeConfig } from '@src/router.config';
import { navItems, primaryCta } from '@src/router.derived';
import type { RouteTarget } from '@src/router.derived';

import type { HeaderLabels } from './Header.types';

/**
 * UI-/a11y-Beschriftungen über Content-Keys (DB, DE/EN) – Fallback = bisheriges Deutsch.
 * Literale `content['header.*']`-Zugriffe bleiben hier stehen, damit `scan-content`
 * sie erfasst und im Admin editierbar hält.
 */
export function headerLabels(content: SiteContentData): HeaderLabels {
  return {
    settings: content['header.a11y.settings'] ?? 'Einstellungen',
    menu: content['header.a11y.menu'] ?? 'Menü',
    menuOpen: content['header.a11y.menuOpen'] ?? 'Menü öffnen',
    menuClose: content['header.a11y.menuClose'] ?? 'Menü schließen',
    mainNav: content['header.a11y.mainNav'] ?? 'Hauptnavigation',
    mobileNav: content['header.a11y.mobileNav'] ?? 'Mobile-Navigation',
    home: content['header.a11y.home'] ?? 'gjo:Se – Startseite',
    language: content['header.utility.language'] ?? 'Sprache',
    appearance: content['header.utility.appearance'] ?? 'Darstellung',
    themeLight: content['header.utility.theme.light'] ?? 'Light Mode',
    themeDark: content['header.utility.theme.dark'] ?? 'Dark Mode',
    login: content['header.utility.login'] ?? 'Login',
    portal: content['header.utility.portal'] ?? 'Portal',
    logout: content['header.utility.logout'] ?? 'Abmelden',
    languageDe: content['header.language.de'] ?? 'Deutsch',
    languageEn: content['header.language.en'] ?? 'English',
  };
}

/** Header-Navigations-Ziele: navItems (Home/Skills/Portfolio/Über mich) + Kontakt als flacher Textlink (Dummy-C). */
export function headerNavTargets(): RouteTarget[] {
  return primaryCta ? [...navItems, primaryCta] : navItems;
}

/** Lokalisierte Ziel-Route (Skills-Pfad dynamisch auflösen). */
export function linkTo(item: RouteTarget, skillsPath: string, lang: Language): string {
  return item.path === routeConfig.fbfSkill.path ? skillsPath : localePath(item, lang);
}

export const menuItemClass =
  'flex w-full cursor-pointer items-center gap-2 rounded-sm px-2.5 py-1.5 text-left text-[0.8125rem] text-on-surface-secondary transition-colors hover:bg-surface-container hover:text-on-surface';
