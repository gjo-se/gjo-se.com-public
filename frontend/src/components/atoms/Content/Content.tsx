import Markdown from '@src/components/primitives/Markdown/Markdown';
import Skeleton from '@src/components/primitives/Skeleton';
import { useLanguage } from '@src/contexts/LanguageContext';
import { useContent } from '@src/providers/siteContent/useContent';

import type { ContentProps } from './Content.interface';

/**
 * Content – renders a localized text from the core_site_content API.
 *
 * Usage:
 *   `<Content id="home.hero.headline" inline />`   – inside h1, buttons, etc.
 *   `<Content id="home.hero.subline" />`           – full block Markdown (default)
 *
 * Supports full GitHub Flavored Markdown: headings, lists, links, bold, etc.
 * While loading, a neutral placeholder is rendered so no raw content key
 * flashes on first paint. Once loaded, a missing value falls back to the key
 * name. In debug mode (?debugContent or localStorage.contentDebug), a small
 * translucent badge showing the key name is rendered next to the text.
 */
export default function Content({ id, inline }: ContentProps) {
  const { lang } = useLanguage();
  const { data, loading } = useContent(lang);

  const value = data[id];
  const isDebug = typeof window !== 'undefined' && (
    localStorage.getItem('contentDebug') === 'true' ||
    new URLSearchParams(window.location.search).has('debugContent')
  );

  // Still loading and no value yet: render a neutral placeholder instead of the
  // raw key. Inline contexts get an inline-block bar (valid inside headings,
  // buttons and labels, where a block element would be invalid); block contexts
  // get a paragraph line. Both reserve space to avoid layout shift.
  if (loading && value === undefined) {
    if (inline) {
      return (
        <span
          data-content-key={id}
          aria-hidden="true"
          className="inline-block h-content-placeholder w-content-placeholder animate-pulse rounded bg-muted align-middle"
        />
      );
    }
    return (
      <div data-content-key={id} aria-hidden="true">
        <Skeleton height="1rem" width="60%" />
      </div>
    );
  }

  const text = value || id;

  if (inline) {
    // Inline-safe: span wrapper, no block elements in MD output
    if (!isDebug) {
      return (
        <span data-content-key={id}>
          <Markdown inline>{text}</Markdown>
        </span>
      );
    }
    return (
      <span data-content-key={id} className="inline-flex items-baseline gap-1">
        <span>
          <Markdown inline>{text}</Markdown>
        </span>
        <span className="text-2xs leading-none opacity-40 bg-gray-200 dark:bg-gray-700 rounded px-1 select-none">
          {id}
        </span>
      </span>
    );
  }

  // Block Markdown (default): full prose rendering
  if (!isDebug) {
    return (
      <div data-content-key={id}>
        <Markdown>{text}</Markdown>
      </div>
    );
  }

  return (
    <div data-content-key={id}>
      <Markdown>{text}</Markdown>
      <span className="text-2xs leading-none opacity-40 bg-gray-200 dark:bg-gray-700 rounded px-1 select-none mt-1 inline-block">
        {id}
      </span>
    </div>
  );
}

export type { ContentProps } from './Content.interface';
