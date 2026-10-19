/**
 * Tests: locale – label/path switching between DE and EN routes.
 *
 * The route slab values are hard-coded from the public route config so the
 * assertions fail when a locale slug or label drifts.
 */
import { describe, expect, it } from 'vitest';

import { localeLabel, localePath, localePathname } from '@src/lib/locale';

const imprint = { path: '/imprint', en: '/en/imprint', label: 'Impressum', labelEn: 'Imprint' };
const withoutEnglish = { path: '/only-de', label: 'Nur Deutsch' };

describe('localeLabel', () => {
  it('liefert das deutsche Label für de', () => {
    expect(localeLabel(imprint, 'de')).toBe('Impressum');
  });

  it('liefert das englische Label für en', () => {
    expect(localeLabel(imprint, 'en')).toBe('Imprint');
  });

  it('fällt ohne englisches Label auf das deutsche zurück', () => {
    expect(localeLabel(withoutEnglish, 'en')).toBe('Nur Deutsch');
  });
});

describe('localePath', () => {
  it('liefert den deutschen Pfad für de', () => {
    expect(localePath(imprint, 'de')).toBe('/imprint');
  });

  it('liefert den englischen Pfad für en', () => {
    expect(localePath(imprint, 'en')).toBe('/en/imprint');
  });

  it('fällt ohne englischen Pfad auf den deutschen zurück', () => {
    expect(localePath(withoutEnglish, 'en')).toBe('/only-de');
  });
});

describe('localePathname', () => {
  it('lässt einen bereits englischen Pfad bei en unverändert', () => {
    expect(localePathname('/en/about', 'en')).toBe('/en/about');
  });

  it('lässt einen deutschen Pfad bei de unverändert', () => {
    expect(localePathname('/about', 'de')).toBe('/about');
  });

  it('übersetzt einen deutschen statischen Pfad in den englischen Slug', () => {
    expect(localePathname('/about', 'en')).toBe('/en/about');
  });

  it('übersetzt dynamische Pfad-Parameter mit', () => {
    expect(localePathname('/skills/42', 'en')).toBe('/en/skills/42');
  });

  it('übersetzt die Startseite auf den englischen Root', () => {
    expect(localePathname('/', 'en')).toBe('/en');
  });

  it('übersetzt einen englischen Slug zurück auf den deutschen Pfad', () => {
    expect(localePathname('/en/imprint', 'de')).toBe('/imprint');
    expect(localePathname('/en', 'de')).toBe('/');
  });

  it('präfixt unbekannte Pfade bei en mit dem Locale-Prefix', () => {
    expect(localePathname('/unbekannt', 'en')).toBe('/en/unbekannt');
  });

  it('entfernt bei unbekannten Pfaden den Locale-Prefix wieder', () => {
    expect(localePathname('/en/unbekannt', 'de')).toBe('/unbekannt');
  });
});
