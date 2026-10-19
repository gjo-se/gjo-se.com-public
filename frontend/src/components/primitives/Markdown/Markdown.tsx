import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import remarkGfm from 'remark-gfm';

import { cn } from '@src/lib/utils';

import { INLINE_COMPONENTS, PROSE_VARIANTS, urlTransform } from './Markdown.utils';

import type { MarkdownProps } from './Markdown.interface';

/**
 * Markdown – Renders markdown content as styled HTML.
 *
 * Supports GitHub Flavored Markdown (tables, strikethrough, task lists)
 * and preserves raw HTML fragments via rehype-raw.
 *
 * Inline mode: no prose wrapper, block elements mapped to inline equivalents.
 * Safe to use inside headings, buttons, and other inline contexts.
 *
 * `className` erweitert/überschreibt die Prose-Defaults (z. B. Lesemaß- und
 * Rhythmus-Anpassungen für lange Rechts-/Fließtexte).
 */
export default function Markdown({ children, inline, variant = 'default' }: MarkdownProps) {
  const body = (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[rehypeRaw]}
      urlTransform={urlTransform}
      components={inline ? INLINE_COMPONENTS : undefined}
    >
      {children}
    </ReactMarkdown>
  );

  if (inline) {
    return body;
  }

  return (
    <div
      className={cn(
        'prose prose-sm max-w-none text-on-surface dark:prose-invert',
        'prose-headings:text-on-surface prose-headings:mt-4 prose-headings:mb-1.5',
        'prose-p:text-on-surface/80 prose-p:my-1.5 prose-p:leading-snug',
        'prose-ul:my-1.5 prose-ol:my-1.5',
        'prose-li:text-on-surface/80 prose-li:my-0.5 prose-li:leading-snug',
        'prose-strong:text-on-surface',
        'prose-a:text-primary',
        PROSE_VARIANTS[variant],
      )}
    >
      {body}
    </div>
  );
}
