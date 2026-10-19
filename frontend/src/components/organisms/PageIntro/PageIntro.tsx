import Text from '@src/components/primitives/Text';

import {
  pageIntroSubtitleVariants,
  pageIntroTitleVariants,
  pageIntroUspVariants,
} from './PageIntro.variants';

export interface PageIntroProps {
  /** Serif-H1 (Instrument Serif) – zentrierte Seitenüberschrift. */
  title: string;
  /** Mono/Kupfer-USP-Zeile unter der Headline (z. B. „AI · Architektur · Clean Code"). */
  usp?: string;
  /** Secondary-Subline unter der USP. */
  subtitle?: string;
}

/**
 * PageIntro – zentrierter Seitenkopf im H1-Block-Muster (INC-6/7).
 *
 * Konsistente Kopf-Struktur der **zentrierten** Public-Seiten: Instrument-Serif-H1
 * (Display), darunter eine Mono/Kupfer-USP-Zeile und optional eine secondary Subline.
 * Zentriert ist das Pendant zu den **linksbündigen** Hero-Sektionen (Home-, Skills-,
 * About-Split-Hero). Regel: links = inhaltsreiche/mehrspaltige Heroes, zentriert =
 * ruhige, einspaltige Intro-/Sammelseiten (Focus, Kontakt).
 * Verbindlich dokumentiert in `docs/runbooks/ui_ux/page-heads.md`.
 * Nutzt ausschließlich das `Text`-Primitive (kein raw HTML, keine Hardcoded-Hex).
 */
export type { PageIntroVariants } from './PageIntro.variants';

export default function PageIntro({ title, usp, subtitle }: PageIntroProps) {
  return (
    <section className="pb-intro-bottom pt-intro-top text-center">
      <div className={pageIntroTitleVariants()}>
        <Text as="h1" variant="display">
          {title}
        </Text>
      </div>
      {usp && (
        <div className={pageIntroUspVariants()}>
          <Text as="p" variant="usp" weight="medium">
            {usp}
          </Text>
        </div>
      )}
      {subtitle && (
        <div className={pageIntroSubtitleVariants()}>
          <Text as="p" variant="lead-lg">
            {subtitle}
          </Text>
        </div>
      )}
    </section>
  );
}
