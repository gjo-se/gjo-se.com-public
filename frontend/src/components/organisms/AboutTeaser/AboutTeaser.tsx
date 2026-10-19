import Image from '@src/components/primitives/Image';
import Link from '@src/components/primitives/Link';
import Markdown from '@src/components/primitives/Markdown/Markdown';
import Text from '@src/components/primitives/Text';

import { aboutTeaserHookVariants, aboutTeaserPortraitVariants } from './AboutTeaser.variants';

import type { AboutTeaserProps } from './AboutTeaser.interface';

/**
 * AboutTeaser – kuratierter Credibility-Teaser der Homepage.
 *
 * Kompakter Block: links ein rundes Avatar-Bild, rechts Eyebrow (`// about`) +
 * Name (H2, sans/semibold) + Rolle (mono primary) + Story-Hook (deckungsgleich
 * mit den Social-Profilen) + CTA „Mehr über mich" (`Link variant="cta"` mit
 * persistentem Pfeil). Bewusst kein zweiter
 * Split-Hero wie auf `/about` – nur der kurze Einstieg in die weiterführende
 * Seite. Presentational – Daten kommen aus `useApplicationProfile()` (SSOT) bzw.
 * Content-Nodes vom Parent.
 */
export type { AboutTeaserProps } from './AboutTeaser.interface';
export type { AboutTeaserVariants } from './AboutTeaser.variants';

export default function AboutTeaser({
  eyebrow,
  name,
  role,
  photoUrl,
  hook,
  ctaLabel,
  ctaHref,
}: AboutTeaserProps) {
  const portraitFallback = (
    <Text as="span" variant="eyebrow" color="secondary">
      Porträt
    </Text>
  );

  return (
    <section className="reveal py-section-lg" aria-labelledby="about-teaser-title">
      <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-center sm:gap-8">
        {/* Rundes Avatar-Bild (klein) – Teaser, nicht der große /about-Hero */}
        <div className={aboutTeaserPortraitVariants()}>
          {photoUrl ? (
            <Image
              src={photoUrl}
              alt=""
              fit="cover"
              loading="lazy"
              fallback={portraitFallback}
            />
          ) : (
            portraitFallback
          )}
        </div>

        {/* Text-Spalte: Eyebrow + Name / Rolle / Story-Hook / Link */}
        <div className="overflow-hidden">
          <div className="flex items-baseline gap-4">
            {eyebrow && (
              <div className="shrink-0">
                <Text as="span" variant="eyebrow">
                  {eyebrow}
                </Text>
              </div>
            )}
            <Text as="h2" id="about-teaser-title" variant="title">
              {name}
            </Text>
          </div>

          {role && (
            <div className="mt-2">
              <Text as="p" variant="meta" color="primary" weight="medium">
                {role}
              </Text>
            </div>
          )}

          {hook && (
            <div className={aboutTeaserHookVariants()}>
              <Markdown>{hook}</Markdown>
            </div>
          )}

          <div className="mt-6">
            <Link to={ctaHref} variant="cta">
              {ctaLabel}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
