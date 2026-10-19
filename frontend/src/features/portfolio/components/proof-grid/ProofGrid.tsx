import { useState } from 'react';

import SectionGrid from '@src/components/primitives/SectionGrid';
import Text from '@src/components/primitives/Text';

import ProofCard from '../proof-card/ProofCard';
import ProofLightbox from '../proof-lightbox/ProofLightbox';

import type { Proof } from '../../core/types';

/** Props for `ProofGrid`. */
export interface ProofGridProps {
  proofs: Proof[];
  /** Erzeugt den Bild-Stream-URL für einen Storage-Key. */
  streamUrl: (key: string) => string;
  /** `//`-Eyebrow über der Sektion (Content-Key `portfolio.proofs.eyebrow`). */
  eyebrow?: string;
  /** H2-Überschrift der Sektion (Content-Key `portfolio.proofs.title`). */
  title?: string;
}

/**
 * ProofGrid – Organism: Proof-Sektion eines Portfolio-Projekts (Ticket #2829).
 *
 * Normale Content-Sektion (exakt Dummy `portfolio-detail.html`): `//`-Eyebrow +
 * H2-Überschrift (`portfolio.proofs.*` Content-Keys, Props vom Parent) über einem
 * A/B-Breiten-Raster der Proofs. Die Reihenfolge liefert das Backend (``sort`` ASC);
 * ``high``-Proofs spannen über beide Spalten (`SECTION_GRID_FULL_WIDTH`, 10/12 der
 * Breite – kleiner als der Hero), alle übrigen liegen halbbreit nebeneinander. Ein
 * Klick auf einen Proof öffnet die ProofLightbox am jeweiligen Index. Leere
 * Proofs-Liste rendert nichts.
 */
export default function ProofGrid({ proofs, streamUrl, eyebrow, title }: ProofGridProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  if (proofs.length === 0) return null;

  return (
    <section className="reveal py-section" aria-labelledby="proofs-title">
      {(eyebrow || title) && (
        <div className="mb-12 flex flex-col items-start gap-2 md:flex-row md:items-baseline md:gap-4">
          {eyebrow && (
            <div className="shrink-0">
              <Text as="span" variant="eyebrow">
                {eyebrow}
              </Text>
            </div>
          )}
          {title && (
            <Text as="h2" id="proofs-title" variant="title">
              {title}
            </Text>
          )}
        </div>
      )}

      <SectionGrid>
        {proofs.map((proof, index) => (
          <ProofCard
            key={proof.id}
            proof={proof}
            streamUrl={streamUrl}
            fullWidth={proof.priority === 'high'}
            onClick={() => setOpenIndex(index)}
          />
        ))}
      </SectionGrid>

      {proofs.length > 0 && (
        <ProofLightbox
          proofs={proofs}
          openIndex={openIndex}
          onClose={() => setOpenIndex(null)}
          streamUrl={streamUrl}
        />
      )}
    </section>
  );
}
