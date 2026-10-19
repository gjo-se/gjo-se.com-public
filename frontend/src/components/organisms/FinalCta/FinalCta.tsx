import FullBleedBand from '@src/components/primitives/FullBleedBand';
import Link from '@src/components/primitives/Link';
import Text from '@src/components/primitives/Text';
import { useLanguage } from '@src/contexts/LanguageContext';
import { useContent } from '@src/providers/siteContent/useContent';
import { routeConfig } from '@src/router.config';

import { finalCtaInnerVariants, finalCtaKnobVariants, finalCtaRingVariants } from './FinalCta.variants';

/**
 * FinalCta – Abschluss-CTA („Notaus") für Home + About (EIN gemeinsamer Code).
 *
 * Drei Elemente: Sektions-Kopf (`// contact` + H2 „wenn’s brennt") im Typo-Idiom der
 * übrigen Sektionen (Mono-Eyebrow + Sans-H2, hier zentriert) → zentrierter Notaus-Knopf
 * mit innerem Kupferkreis + äußerem Ring und Puls-Signal dazwischen (Hover verstärkt das
 * Signal) → Microcopy. Die SOS-Morse (·· ···) lebt als Signatur im Kontakt-Hero.
 * Inhalte = Content-Keys (DE/EN).
 */
export type { FinalCtaVariants } from './FinalCta.variants';

export default function FinalCta() {
  const { lang } = useLanguage();
  const { data: content } = useContent(lang);

  const eyebrow = content['home.contact.eyebrow'] ?? '// contact';
  const headline = content['home.contact.heading'] ?? 'wenn’s brennt';
  const microcopy = content['home.contact.trust'] ?? '';
  const ctaLabel = content['home.contact.cta'] ?? 'SOS';
  const contactPath = lang === 'en' ? routeConfig.contact.en : routeConfig.contact.path;

  return (
    <FullBleedBand padding="section">
      <div className={finalCtaInnerVariants()}>
        {/* Sektions-Kopf im Typo-Idiom der übrigen Sektionen (Eyebrow + H2, zentriert) */}
        <div className="flex items-baseline justify-center gap-4">
          <div className="shrink-0">
            <Text as="span" variant="eyebrow">
              {eyebrow}
            </Text>
          </div>
          <Text as="h2" variant="title">
            {headline}
          </Text>
        </div>

        {/* Notaus-Knopf: äußerer Ring + innerer Kupferkreis + Puls-Signal (Hover verstärkt) */}
        <div className="flex justify-center">
          <div className={finalCtaKnobVariants()}>
            {/* Puls-Signal: läuft vom inneren Kreis zum äußeren Ring; Hover = schneller + dicker */}
            <div aria-hidden="true" className={finalCtaRingVariants()} />
            {/* Innerer Kupferkreis (der eigentliche CTA) */}
            <Link
              to={contactPath}
              variant="sos-solid"
              aria-label={`${ctaLabel} – wenn’s brennt`}
            >
              {ctaLabel}
            </Link>
          </div>
        </div>

        {microcopy && (
          <div className="mt-6">
            <Text as="p" variant="note" color="secondary" align="center">
              {microcopy}
            </Text>
          </div>
        )}
      </div>
    </FullBleedBand>
  );
}
