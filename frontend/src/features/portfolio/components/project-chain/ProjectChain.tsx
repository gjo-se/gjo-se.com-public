import { Fragment } from 'react';

import FullBleedBand from '@src/components/primitives/FullBleedBand';
import Link from '@src/components/primitives/Link';
import Text from '@src/components/primitives/Text';
import { useLanguage } from '@src/contexts/LanguageContext';
import type { Language } from '@src/contexts/LanguageContext';
import { localePathname } from '@src/lib/locale';

import { QUOTE_BOX, QUOTE_TEXT } from './constants';

import type { ProjectChainPhase } from '../../core/types';
import type { ReactNode } from 'react';


/** Props for `ProjectChain`. */
export interface ProjectChainProps {
  /** Eyebrow-Präfix der Sektion (Mono/Primary, z. B. "//"). */
  eyebrow?: ReactNode;
  /** Sektionsüberschrift (H2). */
  heading: ReactNode;
  /** Die drei Phasen in fester Reihenfolge – zwischen ihnen Kupfer-Pfeile. */
  phases: ProjectChainPhase[];
  /** Abschluss-Leitgedanke (Zitat) als Abschluss der Sektion – rein informativ. */
  quote?: ProjectChainQuote;
}

/** Zitat-Abschluss der Kette. */
interface ProjectChainQuote {
  /** Zitat-Text (lokalisierter Content). */
  text: ReactNode;
  /** Zitat-Attribution (Autor, lokalisierter Content). */
  author?: ReactNode;
}

function phaseHref(slug: string, lang: Language): string {
  return localePathname(`/focus/${slug}`, lang);
}

/**
 * ProjectChain – Home-Kette „Der Prozess, der Produktion stabil macht" (Dummy C).
 *
 * Randloses Full-Bleed-Band (Surface-Container + obere/untere Haarlinie, wie `.chain`)
 * mit drei textbasierten, verlinkten Phasen-Karten (01/02/03) in gleich hohem Grid
 * (Desktop `1fr auto 1fr auto 1fr`), getrennt durch horizontale Kupfer-Pfeile. Abschluss:
 * der Leitgedanke als Zitat in einer Kupfer-Subtle-Box (wie `.chain__result`, aber als
 * informatives Zitat, KEIN CTA). Keine Projekt-Bilder – die Kette erzählt die Arbeitsweise
 * als Konzept; Beweise liegen auf den Detailseiten. Mobil stapeln sich die Phasen vertikal
 * (Pfeile 90° gedreht). Presentational – Texte kommen als lokalisierte Content-Nodes.
 */
export default function ProjectChain({ eyebrow, heading, phases, quote }: ProjectChainProps) {
  const { lang } = useLanguage();

  const arrow = (
    <svg
      viewBox="0 0 32 16"
      width="32"
      height="16"
      fill="none"
      aria-hidden="true"
      className="my-3 rotate-90 self-center justify-self-center text-primary md:my-0 md:rotate-0"
    >
      <path
        d="M2 8h26M24 3l6 5-6 5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );

  return (
    <FullBleedBand padding="section">
      <div>
        <div className="mb-12 flex items-baseline gap-4">
          {eyebrow && (
            <div className="shrink-0">
              <Text as="span" variant="eyebrow">
                {eyebrow}
              </Text>
            </div>
          )}
          <Text as="h2" variant="title">
            {heading}
          </Text>
        </div>

        <div className="grid grid-cols-1 items-stretch gap-6 md:grid-cols-chain md:gap-6">
          {phases.map((phase, i) => (
            <Fragment key={phase.slug}>
              {i > 0 && arrow}
              <Link
                to={phaseHref(phase.slug, lang)}
                variant="portfolio-chain"
              >
                <Text variant="eyebrow-sm" weight="semibold">
                  {phase.num}
                  {phase.subTitle ? ` · ${phase.subTitle}` : ''}
                </Text>
                <Text as="span" variant="subtitle" weight="semibold">
                  {phase.title}
                </Text>
                {phase.description && (
                  <Text as="span" variant="copy">
                    {phase.description}
                  </Text>
                )}
                <div className="mt-auto pt-2">
                  <Text as="span" variant="meta" size="xs" weight="medium" color="secondary">
                    /focus/{phase.slug}
                  </Text>
                </div>
              </Link>
            </Fragment>
          ))}
        </div>

        {quote && (
          <div className={QUOTE_BOX}>
            <div className={QUOTE_TEXT}>
              <Text as="blockquote" variant="body">
                {quote.text}
              </Text>
            </div>
            {quote.author && (
              <Text variant="meta" size="xs" weight="medium" color="secondary">
                — {quote.author}
              </Text>
            )}
          </div>
        )}
      </div>
    </FullBleedBand>
  );
}
