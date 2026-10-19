import HeroCanvas from '@src/components/primitives/HeroCanvas';
import Image from '@src/components/primitives/Image';
import Markdown from '@src/components/primitives/Markdown/Markdown';
import Text from '@src/components/primitives/Text';
import { buildWebpKeys } from '@src/lib/getStreamUrl';

import { HERO_SCRIM, HERO_SUBTITLE, HERO_TITLE, IMPACT_BAND } from './constants';

export interface PortfolioHeroProps {
  /** Storage-Key des Hero-/Teaser-Bildes. */
  image: string;
  /** Titel (Alt-Text). */
  alt: string;
  /** Projekt-Titel – als H1 im Overlay. */
  title: string;
  /** Projekt-Untertitel – als Tagline im Overlay. */
  subTitle?: string | null;
  /** Impact-/Stat-Band unter dem Bild (Markdown erlaubt). */
  impactSummary?: string | null;
  /** Erzeugt den Bild-Stream-URL für einen Storage-Key. */
  streamUrl: (key: string) => string;
}

/**
 * PortfolioHero – Hero eines Portfolio-Projekts (Public-Detail).
 *
 * Kinoleinwand-Format 21:9 mit dunklem Gradient-Overlay für die Kopfzeile
 * (H1 `title` → Tagline `sub_title`) und einem Impact-/Stat-Band
 * (`impact_summary`) direkt unter dem Bild. Überschrift und Beweis konkurrieren
 * dadurch nicht um Aufmerksamkeit: Marke im Bild, Zahlen als eigene Leiste darunter.
 *
 * Nutzt die geteilte `HeroCanvas`-Layout-Grundlage (identisch zur Skills-Seite).
 * Ohne `image` rendert die Komponente nichts – der Aufrufer bindet sie nur ein,
 * wenn ein Bild existiert.
 */
export default function PortfolioHero({
  image,
  alt,
  title,
  subTitle,
  impactSummary,
  streamUrl,
}: PortfolioHeroProps) {
  const hasOverlay = Boolean(title || subTitle);

  // Ratio-aware WebP-Set aus dem Master-Key ableiten – das Hero ist 21:9
  // (Kinoleinwand), also die 21-9-Variante im responsiven srcset verwenden.
  const webpKeys = buildWebpKeys(image);

  return (
    <HeroCanvas
      footer={
        impactSummary ? (
          // Impact-/Ergebnis-Band: `impact_summary`-Markdown im Hero-Footer. Sekundär-Text,
          // die **fett** gesetzten Messwerte (Messwert) erscheinen in Primary/Kupfer – exakt
          // wie `.portfolio-hero__footer strong` im Dummy. Inline-Markdown (kein Prose-
          // Wrapper), damit `strong` per Arbitrary-Selector primär gefärbt werden kann.
          <div className={IMPACT_BAND}>
            <Markdown inline>{impactSummary}</Markdown>
          </div>
        ) : undefined
      }
    >
      <Image
        src={streamUrl(image)}
        webpKeys={webpKeys}
        ratio="16-9"
        sizes="(min-width: 1536px) 1920px, (min-width: 1024px) 1280px, 100vw"
        alt={alt}
        fit="cover"
        objectPosition="50% 62%"
        loading="eager"
      />

      {/* Dunkler Verlauf für ausreichenden Text-Kontrast über dem Bild */}
      <div
        aria-hidden="true"
        className={HERO_SCRIM}
      />

      {hasOverlay && (
        <div className="absolute inset-x-0 bottom-0 flex flex-col items-start gap-2 p-6 sm:p-8">
          {title && (
            <div className={HERO_TITLE}>
              <Text as="h1" variant="display-md" color="inherit">
                {title}
              </Text>
            </div>
          )}
          {subTitle && (
            <div className={HERO_SUBTITLE}>
              <Text as="p" variant="subtitle" color="inherit">
                {subTitle}
              </Text>
            </div>
          )}
        </div>
      )}
    </HeroCanvas>
  );
}
