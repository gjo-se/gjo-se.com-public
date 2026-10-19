import Image from '@src/components/primitives/Image';
import { SECTION_GRID_FULL_WIDTH } from '@src/components/primitives/SectionGrid';
import Text from '@src/components/primitives/Text';
import { buildWebpKeys } from '@src/lib/getStreamUrl';

import { PROOF_PLACEHOLDER, PROOF_ZOOM } from './constants';

import type { Proof } from '../../core/types';

/** Props for `ProofCard`. */
export interface ProofCardProps {
  proof: Proof;
  /** Erzeugt den Bild-Stream-URL für einen Storage-Key. */
  streamUrl: (key: string) => string;
  /** Spannenvoll-breit im Raster (``high``-Proofs) – A/B-Hierarchie. */
  fullWidth?: boolean;
  /** Öffnet die ProofLightbox am jeweiligen Index. */
  onClick?: () => void;
}

/**
 * ProofCard – Molecule für einen einzelnen Proof als editoriales ``<figure>``.
 *
 * **Bild + Caption (getrennt), kein Text-über-Bild:**
 * - Das Bild liegt oben als eigener Bereich und ist **immer vollständig sichtbar** –
 *   `cover`-Beschnitt, dezenter Hover-Zoom als einzige Interaktion.
 * - Frage (Q) und Antwort (A) stehen als **Caption unter dem Bild** auf der
 *   Surface-Container-Karte (Mono-Eyebrow oben, Statement als Body). Dadurch entfällt
 *   der dunkle Gradient-Overlay über dem Bild und damit das Text-über-Bild-Kontrastrisiko.
 *
 * ``high``-Proofs (``fullWidth``) spannen die volle Rasterbreite ein, nutzen aber nur
 * 10/12 der Container-Breite im 21:9-Format – damit garantiert kleiner als der Hero.
 * Halbbreite Proofs nutzen ``4/3``. Ist ein ``onClick`` gesetzt, wird die Figure als
 * klickbares Element gerendert (Enter öffnet die Lightbox).
 */
export default function ProofCard({
  proof,
  streamUrl,
  fullWidth = false,
  onClick,
}: ProofCardProps) {
  const { image_src, statement, question } = proof;

  // Für high/21:9 wird der 16:9-Master geladen und im Browser per cover auf 21:9
  // gecroppt (wie PortfolioHero). Würde man hier die serverseitig bereits auf 21:9
  // gestanzte Variante (ratio "21-9") laden, hätte das Bild selbst schon 21:9 – ein
  // object-position könnte den Ausschnitt dann NICHT mehr verschieben (kein Overflow).
  // medium → 4-3-Variante.
  const ratio = fullWidth ? '16-9' : '4-3';
  const webpKeys = buildWebpKeys(image_src);

  // Der 16:9-Master im 21:9-Container wird per cover oben+unten beschnitten (der
  // sichtbare Streifen liegt standardmäßig vertikal zentriert). Ohne Fokus-Anker
  // sitzt der Inhalt sonst "zu tief" im sichtbaren Ausschnitt. Greg 2026-09-03:
  // Inhalt per CSS "nach oben (mittig)" schieben – Focal Point Richtung obere
  // Bildhälfte (Y < 50 %), damit der sichtbare 21:9-Streifen den weiter oben
  // liegenden Inhalt erfasst.
  // Referenz: PortfolioHero nutzt "50% 62%" (wirkt laut Greg zu tief) → hier
  // deutlich weiter nach oben. Justierbar an dieser Stelle; Mechanik = wie Hero.
  const objectPosition = fullWidth ? '50% 30%' : undefined;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (onClick && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      onClick();
    }
  };

  return (
    <figure
      className={[
        'group flex flex-col overflow-hidden rounded-lg border border-border bg-surface shadow-sm',
        fullWidth ? SECTION_GRID_FULL_WIDTH : '',
      ].join(' ')}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      aria-label={onClick && statement ? statement : undefined}
      onClick={onClick}
      onKeyDown={onClick ? handleKeyDown : undefined}
    >
      {/* Bildbereich: sauber, immer sichtbar – Hover-Zoom statt Overlay-Hide */}
      <div className={fullWidth ? 'relative aspect-panorama' : 'relative aspect-thumb'}>
        {image_src ? (
          <div className={PROOF_ZOOM}>
            <Image
              src={streamUrl(image_src)}
              webpKeys={webpKeys}
              ratio={ratio}
              sizes={
                fullWidth
                  ? '(min-width: 1536px) 1280px, (min-width: 1024px) 1000px, 100vw'
                  : '(min-width: 1024px) 600px, 100vw'
              }
              alt={statement ?? undefined}
              fit="cover"
              objectPosition={objectPosition}
              loading="lazy"
            />
          </div>
        ) : (
          <div className={PROOF_PLACEHOLDER} aria-hidden="true" />
        )}
      </div>

      {/* Caption unter dem Bild – kein Text-über-Bild, kein Kontrast-Overlay nötig */}
      <figcaption className="flex flex-col gap-1 border-t border-border p-6">
        {question && (
          <Text
            as="span"
            variant="meta"
            size="xs"
            weight="medium"
            uppercase
            color="primary-subtle"
          >
            {question}
          </Text>
        )}
        {statement && (
          <Text as="p" variant="body" weight="medium" color="on-surface">
            {statement}
          </Text>
        )}
      </figcaption>
    </figure>
  );
}
