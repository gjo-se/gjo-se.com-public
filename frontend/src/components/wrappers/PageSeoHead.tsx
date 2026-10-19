import { Helmet } from 'react-helmet-async';

import type { Language } from '@src/contexts/LanguageContext';
import { useContent } from '@src/providers/siteContent/useContent';

/**
 * Öffentliche Seiten mit eigener SEO (Content-Keys `${page}.seo.*`).
 *
 * Die Focus-Detailseiten führen eigene Keys (`focus.<slug>.seo.*`), damit nicht
 * alle `/focus/*`-URLs denselben Titel tragen.
 */
export type PageSeoKey =
  | 'home'
  | 'focus'
  | 'focusAi'
  | 'focusArchitecture'
  | 'focusCleanCode'
  | 'skills'
  | 'about'
  | 'contact'
  | 'imprint'
  | 'privacy';

/** Rohe, lokalisierte SEO-Felder einer Seite (vor Fallback/Trim). */
interface SeoRawFields {
  rawTitle: string;
  rawDescription: string;
}

/**
 * Seite → Literal-Zugriffe auf die Content-Keys.
 *
 * Die `content['<page>.seo.*']`-Zugriffe bleiben **literal**, damit `scan-content`
 * sie erfasst und im Admin (Site Content) anlegbar/editierbar macht.
 */
const SEO_READERS: Record<PageSeoKey, (content: Record<string, string>) => SeoRawFields> = {
  home: (content) => ({
    rawTitle: content['home.seo.title'] ?? '',
    rawDescription: content['home.seo.description'] ?? '',
  }),
  focus: (content) => ({
    rawTitle: content['focus.seo.title'] ?? '',
    rawDescription: content['focus.seo.description'] ?? '',
  }),
  focusAi: (content) => ({
    rawTitle: content['focus.ai.seo.title'] ?? '',
    rawDescription: content['focus.ai.seo.description'] ?? '',
  }),
  focusArchitecture: (content) => ({
    rawTitle: content['focus.architecture.seo.title'] ?? '',
    rawDescription: content['focus.architecture.seo.description'] ?? '',
  }),
  focusCleanCode: (content) => ({
    rawTitle: content['focus.clean-code.seo.title'] ?? '',
    rawDescription: content['focus.clean-code.seo.description'] ?? '',
  }),
  skills: (content) => ({
    rawTitle: content['skills.seo.title'] ?? '',
    rawDescription: content['skills.seo.description'] ?? '',
  }),
  about: (content) => ({
    rawTitle: content['about.seo.title'] ?? '',
    rawDescription: content['about.seo.description'] ?? '',
  }),
  contact: (content) => ({
    rawTitle: content['contact.seo.title'] ?? '',
    rawDescription: content['contact.seo.description'] ?? '',
  }),
  imprint: (content) => ({
    rawTitle: content['imprint.seo.title'] ?? '',
    rawDescription: content['imprint.seo.description'] ?? '',
  }),
  privacy: (content) => ({
    rawTitle: content['privacy.seo.title'] ?? '',
    rawDescription: content['privacy.seo.description'] ?? '',
  }),
};

/** Seite → Title-Fallback (falls Content-Key leer/fehlt), sprachbewusst. */
function fallbackTitle(pageKey: PageSeoKey, lang: Language): string {
  const label: Record<PageSeoKey, string> = {
    home: '',
    focus: 'Focus',
    focusAi: 'AI · Focus',
    focusArchitecture: 'Architecture · Focus',
    focusCleanCode: 'Clean Code · Focus',
    skills: 'Skills',
    about: lang === 'de' ? 'Über mich' : 'About',
    contact: lang === 'de' ? 'Kontakt' : 'Contact',
    imprint: lang === 'de' ? 'Impressum' : 'Imprint',
    privacy: lang === 'de' ? 'Datenschutz' : 'Privacy',
  };
  return label[pageKey] ? `${label[pageKey]} | gjo-se.com` : 'gjo-se.com';
}

/** Setzt <title> + Meta-Description einer öffentlichen Marketing-Seite via Helmet. */
export default function PageSeoHead({ pageKey, lang }: { pageKey: PageSeoKey; lang: Language }) {
  const { data: content } = useContent(lang);
  const { title, description } = resolveSeo(pageKey, content, lang);

  return (
    <Helmet>
      <title>{title}</title>
      {description ? <meta name="description" content={description} /> : null}
    </Helmet>
  );
}

/**
 * Liest per Seite title/description aus den lokalisierten Content-Keys (DB, DE/EN).
 * Literale `content['<page>.seo.*']`-Zugriffe → werden von `scan-content` erfasst
 * und im Admin (Site Content) anlegbar/editierbar.
 */
function resolveSeo(
  pageKey: PageSeoKey,
  content: Record<string, string>,
  lang: Language,
): { title: string; description: string | undefined } {
  const { rawTitle, rawDescription } = SEO_READERS[pageKey](content);
  const title = rawTitle.trim() || fallbackTitle(pageKey, lang);
  const description = rawDescription.trim() || undefined;
  return { title, description };
}
