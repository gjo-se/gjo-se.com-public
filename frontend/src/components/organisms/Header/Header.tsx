import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { NavLink as RouterNavLink, useLocation, useNavigate } from 'react-router';

import Icon from '@src/components/primitives/Icon';
import Logo from '@src/components/primitives/Logo';
import NavButton from '@src/components/primitives/NavButton';
import Text from '@src/components/primitives/Text';
import { useLanguage } from '@src/contexts/LanguageContext';
import type { Language } from '@src/contexts/LanguageContext';
import { useAuth } from '@src/hooks/useAuth';
import { useDarkMode } from '@src/hooks/useDarkMode';
import { useProofNavigation } from '@src/hooks/useProofNavigation';
import { localeLabel, localePathname } from '@src/lib/locale';
import { cn } from '@src/lib/utils';
import { useContent } from '@src/providers/siteContent/useContent';
import { route } from '@src/router.derived';

import { headerNavTargets, headerLabels, linkTo, menuItemClass } from './Header.utils';
import {
  headerBarVariants,
  headerDrawerSectionVariants,
  headerMenuSectionVariants,
  headerUtilityMenuVariants,
} from './Header.variants';

/**
 * Header – globaler Public-Header exakt nach Clickdummy Variante C.
 *
 * Links die Marke (Desktop: Combo-Wortmarke, Mobile: nur Icon-Pfeil). Daneben die flachen
 * Navigations-Links. Rechts ein dezentes Utility-Menü (ein Icon: Zahnrad) mit Sprache,
 * Darstellung (Theme) und Konto (Login/Portal · Abmelden). Mobil kollabieren Links + Utility
 * in einen Hamburger, der einen Drawer mit denselben Funktionen öffnet.
 */
export type { HeaderVariants } from './Header.variants';

export default function Header() {
  const { lang } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const { skillsPath } = useProofNavigation();
  const { user, logout } = useAuth();
  const [isDark, toggleDark] = useDarkMode();
  const { data: content } = useContent(lang);

  const [utilityOpen, setUtilityOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const utilityRef = useRef<HTMLDivElement>(null);

  const targets = headerNavTargets();
  const isAdmin = user?.role === 'admin';

  // UI-/a11y-Beschriftungen über Content-Keys (DB, DE/EN) – Fallback = bisheriges Deutsch.
  const labels = headerLabels(content);

  // Toggle zeigt den ZIEL-Zustand (was der Klick bewirkt) – konsistent zu `VerticalNav`.
  const themeLabel = isDark ? labels.themeLight : labels.themeDark;

  // Utility-Menü bei Klick außerhalb / Escape schließen.
  useEffect(() => {
    if (!utilityOpen) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!utilityRef.current?.contains(event.target as Node)) setUtilityOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setUtilityOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [utilityOpen]);

  const closeAll = () => {
    setUtilityOpen(false);
    setDrawerOpen(false);
  };

  const switchLang = (targetLang: Language) => {
    closeAll();
    if (targetLang === lang) return;
    navigate(localePathname(location.pathname, targetLang), { replace: true });
  };

  const go = (path: string) => {
    closeAll();
    navigate(path);
  };

  const handleLogout = async () => {
    closeAll();
    await logout();
    navigate(route.home.path);
  };

  const navLinkClass = (active: boolean) =>
    cn(
      'link-slide text-nav text-on-surface-secondary hover:text-on-surface',
      active && 'font-medium text-primary hover:text-primary',
    );

  // Aktiv-Zustand über den aktuellen Pfad (statt NavLink-`to`): Dadurch ist z. B. „Skills"
  // auch auf der Basis-`/skills` aktiv – nicht nur auf dem Bewerbungs-/`/skills/<id>`-Pfad,
  // den der Link (via Proof-Session) sonst als Ziel hat.
  const navItemActive = (item: { path: string }) => {
    const clean = location.pathname.replace(/^\/en/, '') || '/';
    const base = item.path;
    if (base === '/') return clean === '/';
    return clean === base || clean.startsWith(`${base}/`);
  };

  return (
    <header className="sticky top-0 z-40 border-b border-border-light bg-surface/85 backdrop-blur-md print:hidden">
      <div className={headerBarVariants()}>
        {/* Marke: Desktop Combo-Wortmarke, Mobile nur Icon-Pfeil (Dummy-C brand__full / brand__icon) */}
        <RouterNavLink
          to={route.home.path}
          aria-label={labels.home}
          className="inline-flex items-center text-on-surface no-underline"
        >
          <div className="hidden md:block">
            <Logo variant="combo" size="2xl" aria-label="gjo:Se" />
          </div>
          <div className="md:hidden">
            <Logo variant="favicon" size="xl" aria-label="gjo:Se" />
          </div>
        </RouterNavLink>

        <nav className="flex items-center gap-8" aria-label={labels.mainNav}>
          {/* Desktop: flache Textlinks (≥ 769px) */}
          <div className="hidden items-center gap-6 md:flex">
            {targets.map((item) => (
              <RouterNavLink
                key={item.path}
                to={linkTo(item, skillsPath, lang)}
                end={item.path === route.home.path}
                aria-current={navItemActive(item) ? 'page' : undefined}
                className={navLinkClass(navItemActive(item))}
              >
                {localeLabel(item, lang)}
              </RouterNavLink>
            ))}
          </div>

          {/* Tools: Utility-Menü (Desktop) + Hamburger (Mobile) */}
          <div className="flex items-center gap-2">
            {/* Utility-Menü (desktop only – Dummy blendet es ≤ 768px aus) */}
            <div ref={utilityRef} className="relative hidden md:block">
              <NavButton
                variant="icon"
                icon="settings"
                aria-label={labels.settings}
                aria-expanded={utilityOpen}
                aria-haspopup="true"
                onClick={() => setUtilityOpen((open) => !open)}
              />

              {utilityOpen && (
                <div
                  role="menu"
                  className={headerUtilityMenuVariants()}
                >
                  {/* Sprache */}
                  <div className="py-1">
                    <Text variant="caps">{labels.language}</Text>
                    <NavButton
                      variant="menu"
                      tone={lang === 'de' ? 'primary' : 'default'}
                      label={labels.languageDe}
                      iconEnd={lang === 'de' ? 'check' : undefined}
                      role="menuitemradio"
                      aria-checked={lang === 'de'}
                      onClick={() => switchLang('de')}
                    />
                    <NavButton
                      variant="menu"
                      tone={lang === 'en' ? 'primary' : 'default'}
                      label={labels.languageEn}
                      iconEnd={lang === 'en' ? 'check' : undefined}
                      role="menuitemradio"
                      aria-checked={lang === 'en'}
                      onClick={() => switchLang('en')}
                    />
                  </div>

                  {/* Darstellung */}
                  <div className={headerMenuSectionVariants()}>
                    <Text variant="caps">{labels.appearance}</Text>
                    <NavButton
                      variant="menu"
                      iconStart={isDark ? 'sun' : 'moon'}
                      label={themeLabel}
                      role="menuitem"
                      onClick={toggleDark}
                    />
                  </div>

                  {/* Konto */}
                  <div className={headerMenuSectionVariants()}>
                    {user === null ? (
                      <RouterNavLink
                        to={route.login.path}
                        role="menuitem"
                        onClick={closeAll}
                        className={cn(menuItemClass, 'font-medium text-primary')}
                      >
                        <Icon name="log-in" aria-hidden />
                        <Text as="span" color="inherit">
                          {labels.login}
                        </Text>
                      </RouterNavLink>
                    ) : (
                      <>
                        {isAdmin && (
                          <RouterNavLink
                            to={route.adminDashboard.path}
                            role="menuitem"
                            onClick={closeAll}
                            className={cn(menuItemClass, 'font-medium text-primary')}
                          >
                            <Icon name="layout-dashboard" aria-hidden />
                            <Text as="span" color="inherit">
                              {labels.portal}
                            </Text>
                          </RouterNavLink>
                        )}
                        <NavButton
                          variant="menu"
                          iconStart="log-out"
                          label={labels.logout}
                          role="menuitem"
                          onClick={handleLogout}
                        />
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Hamburger (mobile only) */}
            <div className="md:hidden">
              <NavButton
                variant="iconLg"
                icon="menu"
                aria-label={labels.menuOpen}
                aria-expanded={drawerOpen}
                aria-controls="mobile-drawer"
                onClick={() => setDrawerOpen(true)}
              />
            </div>
          </div>
        </nav>
      </div>

      {/* ── Mobile-Drawer (≤ 768px, exakt Dummy-C mobile-drawer) ──
          Wird per Portal auf document.body gerendert, damit backdrop-blur des Headers nicht
          zum Containing-Block für das fixed-Overlay wird (sonst liegt der Drawer hinter Content). */}
      {drawerOpen &&
        createPortal(
          <div className="fixed inset-0 z-drawer md:hidden" id="mobile-drawer">
            {/* Backdrop */}
            <NavButton
              variant="scrim"
              aria-label={labels.menuClose}
              onClick={closeAll}
            />
            {/* Panel */}
            <aside
              role="dialog"
              aria-modal="true"
              aria-label={labels.menu}
              className="absolute right-0 top-0 flex h-full w-drawer flex-col gap-6 overflow-y-auto border-l border-border-light bg-surface p-6 shadow-lg"
            >
              <div className="flex items-center justify-between">
                <Text as="span" variant="brand">
                  gjo:Se
                </Text>
                <NavButton
                  variant="iconLg"
                  icon="x"
                  aria-label={labels.menuClose}
                  onClick={closeAll}
                />
              </div>

              <nav aria-label={labels.mobileNav} className="flex flex-col">
                {targets.map((item) => (
                  <RouterNavLink
                    key={item.path}
                    to={linkTo(item, skillsPath, lang)}
                    end={item.path === route.home.path}
                    onClick={closeAll}
                    className="border-b border-border-light py-2.5 text-nav-lg text-on-surface no-underline last:border-b-0"
                  >
                    {localeLabel(item, lang)}
                  </RouterNavLink>
              ))}
              </nav>

              {/* Sprache – Chips */}
              <div className={headerDrawerSectionVariants()}>
                <Text variant="caps">{labels.language}</Text>
                <div className="mt-1 flex gap-2">
                  <NavButton
                    variant="chip"
                    tone={lang === 'de' ? 'primary' : 'default'}
                    label={labels.languageDe}
                    onClick={() => switchLang('de')}
                  />
                  <NavButton
                    variant="chip"
                    tone={lang === 'en' ? 'primary' : 'default'}
                    label={labels.languageEn}
                    onClick={() => switchLang('en')}
                  />
                </div>
              </div>

              {/* Darstellung */}
              <div className={headerDrawerSectionVariants()}>
                <Text variant="caps">{labels.appearance}</Text>
                <NavButton
                  variant="drawer"
                  iconStart={isDark ? 'sun' : 'moon'}
                  label={themeLabel}
                  onClick={toggleDark}
                />
              </div>

              {/* Konto */}
              <div className={headerDrawerSectionVariants()}>
                {user === null ? (
                  <NavButton
                    variant="drawer"
                    tone="primary"
                    iconStart="log-in"
                    label={labels.login}
                    onClick={() => go(route.login.path)}
                  />
                ) : (
                  <>
                    {isAdmin && (
                      <NavButton
                        variant="drawer"
                        tone="primary"
                        iconStart="layout-dashboard"
                        label={labels.portal}
                        onClick={() => go(route.adminDashboard.path)}
                      />
                    )}
                    <NavButton
                      variant="drawer"
                      iconStart="log-out"
                      label={labels.logout}
                      onClick={handleLogout}
                    />
                  </>
                )}
              </div>
            </aside>
          </div>,
          document.body,
        )}
    </header>
  );
}
