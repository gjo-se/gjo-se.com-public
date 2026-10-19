import { defaultUrlTransform } from 'react-markdown';

import { InlineBlockquote } from './InlineBlockquote';
import { InlineHeading } from './InlineHeading';
import { InlineLi } from './InlineLi';
import { InlineOl } from './InlineOl';
import { InlineP } from './InlineP';
import { InlineUl } from './InlineUl';

import type { MarkdownProps } from './Markdown.interface';

/** Zusätzlich erlaubte URL-Schemata – react-markdown lässt `tel:` sonst fallen. */
const EXTRA_URL_SCHEMES = ['tel:'];

/** Prose-Profile – Verschieben des früheren freien `className` in geschlossene Varianten. */
export const PROSE_VARIANTS: Record<NonNullable<MarkdownProps['variant']>, string> = {
  default: '',
  // Fließtext-Hero: Lesemaß (`max-w-prose`) + Live-Schriftgröße 14 px (Zeilenabstand
  // kommt aus `prose-p:leading-snug` = 1.375). Das Lesemaß liegt am Prose-Baustein
  // selbst – Consumer brauchen keinen `max-w`-Wrapper.
  lead: 'max-w-prose text-sm text-on-surface-secondary',
  // Kompakter Fließtext (z. B. Meilenstein-Beschreibung) – Live 14 px.
  compact: 'text-sm text-on-surface-secondary',
  // Lange Rechtstexte: ruhigerer Zeilenabstand + hervorgehobene Hinweis-Blöcke.
  legal: [
    'prose-p:text-nav prose-p:leading-relaxed prose-p:my-3',
    'prose-headings:mt-10 prose-headings:mb-3',
    '[&>*:first-child]:mt-0',
    'prose-a:underline prose-a:underline-offset-2',
    'prose-blockquote:not-italic prose-blockquote:my-4 prose-blockquote:px-4 prose-blockquote:py-3',
    'prose-blockquote:border-l-2 prose-blockquote:border-primary prose-blockquote:bg-primary-subtle-bg',
    'prose-blockquote:[quotes:none]',
  ].join(' '),
};

/**
 * Erlaubt `tel:`-Links zusätzlich zu den react-markdown-Defaults
 * (http/https/mailto/…). Alles andere läuft durch die Default-Bereinigung.
 */
export function urlTransform(url: string): string {
  return EXTRA_URL_SCHEMES.some((scheme) => url.startsWith(scheme)) ? url : defaultUrlTransform(url);
}

/** react-markdown-`components`-Mapping für den Inline-Modus (Block-Elemente → Inline). */
export const INLINE_COMPONENTS = {
  p: InlineP,
  ul: InlineUl,
  ol: InlineOl,
  li: InlineLi,
  h1: InlineHeading,
  h2: InlineHeading,
  h3: InlineHeading,
  h4: InlineHeading,
  h5: InlineHeading,
  h6: InlineHeading,
  blockquote: InlineBlockquote,
};
