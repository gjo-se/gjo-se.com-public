import Image from '@src/components/primitives/Image';
import Link from '@src/components/primitives/Link';
import Markdown from '@src/components/primitives/Markdown/Markdown';
import Text from '@src/components/primitives/Text';
import { useLanguage } from '@src/contexts/LanguageContext';
import { buildWebpKeys } from '@src/lib/getStreamUrl';
import { localePathname } from '@src/lib/locale';

import { COVER, COVER_PLACEHOLDER, COVER_ZOOM, IMPACT_BAND } from './constants';

import type { PortfolioListItem } from '../../core/types';

/** Props for `ProjectFeature`. */
export interface ProjectFeatureProps {
  project: PortfolioListItem;
  /** Zweistellige laufende Nummer (`01`, `02`, …) aus der `sort`-Reihenfolge. */
  num: string;
  /** Erzeugt den Bild-Stream-URL für einen Storage-Key. */
  streamUrl: (key: string) => string;
}

/**
 * ProjectFeature – Snapshot-Karte eines Portfolio-Projekts (Public-Index).
 *
 * Aufgeräumtes, bildgetriebenes Karten-Format (INC-7 #2828) statt Full-Bleed-Block:
 * Cover-Bild (16:9, WebP) oben, darunter die mono/kupfer META-Zeile im Mail-Muster
 * (`01 AI · Motor` – Nummer + Titel + Metapher als `h2`), darunter als Abschluss ein
 * prominenter Ergebnis-/Impact-Band aus `impact_summary`-Markdown – die **fett**
 * gesetzten Messwerte erscheinen dort in Primary/Kupfer. Mehrere Karten bilden ein
 * ruhiges, scanbares Raster (PortfolioPage). Ganze Karte verlinkt auf `/portfolio/:slug`,
 * Hover = Lift (Border/Shadow) + dezenter Bild-Zoom. Ohne `impact_summary` kein Band
 * (kein Platzhalter); ohne Bild eine getitelte Muted-Fläche.
 */
export default function ProjectFeature({ project, num, streamUrl }: ProjectFeatureProps) {
  const { slug, title, sub_title, image, impact_summary } = project;
  const { lang } = useLanguage();

  const webpKeys = buildWebpKeys(image);

  return (
    <Link
      to={localePathname(`/focus/${slug}`, lang)}
      variant="portfolio-feature"
    >
      {/* Cover 16:9 – WebP via buildWebpKeys, dezenter Hover-Zoom */}
      <div className={COVER}>
        {image ? (
          <div className={COVER_ZOOM}>
            <Image
              src={streamUrl(image)}
              webpKeys={webpKeys}
              ratio="16-9"
              sizes="(min-width: 768px) 50vw, 100vw"
              alt={title}
              fit="cover"
              loading="lazy"
            />
          </div>
        ) : (
          <div className={COVER_PLACEHOLDER}>
            {title}
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2 p-6">
        {/* META-Zeile im Mail-Muster (`01 AI · Motor`): Nummer + Titel + Metapher,
            mono/kupfer – identisch zur `// Focus`-Kopfzeile der Bewerbungs-Mail. */}
        <Text as="h2" variant="eyebrow-sm" weight="semibold">
          {num} {title}
          {sub_title ? ` · ${sub_title}` : ''}
        </Text>

        {/* Impact-Band: border-top + `impact_summary`-Markdown; strong (Messwert) → Primary */}
        {impact_summary && (
          <div className={IMPACT_BAND}>
            <Markdown inline>{impact_summary}</Markdown>
          </div>
        )}
      </div>
    </Link>
  );
}
