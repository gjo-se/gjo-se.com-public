import { useState } from 'react';
import { createPortal } from 'react-dom';

import Button from '@src/components/primitives/Button';
import Icon from '@src/components/primitives/Icon/Icon';
import Image from '@src/components/primitives/Image';
import Text from '@src/components/primitives/Text';
import { useLanguage } from '@src/contexts/LanguageContext';
import { useCarouselNavigation } from '@src/hooks/useCarouselNavigation';
import { buildWebpKeys } from '@src/lib/getStreamUrl';

import {
  BODY,
  FOOTER_ROW,
  HEADER_ROW,
  IMAGE_FRAME,
  IMAGE_FRAME_EMPTY,
  OVERLAY,
  PANEL,
} from './constants';

import type { Proof } from '../../core/types';

/** Props for `ProofLightbox`. */
export interface ProofLightboxProps {
  proofs: Proof[];
  /** Index des angeklickten Proofs – ``null`` = geschlossen. */
  openIndex: number | null;
  /** Schließt die Lightbox. */
  onClose: () => void;
  /** Erzeugt den Bild-Stream-URL für einen Storage-Key. */
  streamUrl: (key: string) => string;
  /** Aktive Locale ('de' | 'en') – reserviert für spätere Lokalisierung. */
  locale?: 'de' | 'en';
}

/**
 * ProofLightbox – Carousel-Dialog über alle Proofs eines Projekts (Ticket #2829).
 *
 * Eigenes Overlay (statt generischer Dialog-Primitive) – exakt die schlanke Linie der
 * Skills-Lightbox (`SkillGroupRadarModal`): Surface-Overlay mit Blur, Panel
 * `bg-surface` + border-light + shadow. Header (Serif-`question`-Titel | Zähler |
 * Schließen) mit unterer Haarlinie, Body mit großem 16:9-Bild und darunter das
 * `statement` als Beschreibung, Footer mit oberer Haarlinie und Prev/Next-Navigation.
 * Esc/Pfeiltasten + Backdrop-Klick schließen bzw. navigieren. `openIndex` startet das
 * Carousel am angeklickten Proof; wrap-around über die ganze Sammlung.
 */
export default function ProofLightbox({
  proofs,
  openIndex,
  onClose,
  streamUrl,
}: ProofLightboxProps) {
  const count = proofs.length;
  const isOpen = openIndex !== null;
  const { lang } = useLanguage();
  const fallbackTitle = lang === 'en' ? 'Proof' : 'Beweis';

  const { activeIndex, setActiveIndex, goPrev, goNext } = useCarouselNavigation({
    count,
    isOpen,
    onClose,
    initialIndex: openIndex ?? 0,
  });

  // ── Carousel-Index – beim Öffnen eines (anderen) Proofs zurücksetzen ──
  const [prevOpenIndex, setPrevOpenIndex] = useState(openIndex);

  if (openIndex !== prevOpenIndex) {
    setPrevOpenIndex(openIndex);
    if (openIndex !== null) {
      setActiveIndex(openIndex);
    }
  }

  const active = proofs[activeIndex] ?? null;
  const canNavigate = count > 1;
  const webpKeys = buildWebpKeys(active?.image_src);

  if (!isOpen || count === 0 || !active) return null;

  const overlay = (
    <div
      className={OVERLAY}
      role="dialog"
      aria-modal="true"
      aria-label="Beweis-Galerie"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Panel – schlanke Linie wie Skills-Lightbox */}
      <div className={PANEL}>
        {/* Header: Serif-question-Titel | Zähler | Schließen + untere Haarlinie */}
        <div className={HEADER_ROW}>
          <Text as="h2" variant="headline" lineClamp={1}>
            {active.question ?? fallbackTitle}
          </Text>
          <div className="shrink-0">
            <Text as="span" variant="meta" color="secondary">
              {activeIndex + 1} / {count}
            </Text>
          </div>
          <Button variant="ghost" size="icon" aria-label="Schließen" onClick={onClose}>
            <Icon name="x" aria-hidden />
          </Button>
        </div>

        {/* Body: großes 16:9-Bild + statement als Beschreibung */}
        <div className={BODY}>
          {active.image_src ? (
            <div className={IMAGE_FRAME}>
              <Image
                src={streamUrl(active.image_src)}
                webpKeys={webpKeys}
                ratio="16-9"
                sizes="(min-width: 1200px) 1100px, 100vw"
                alt={active.statement ?? undefined}
                fit="cover"
              />
            </div>
          ) : (
            <div className={IMAGE_FRAME_EMPTY} aria-hidden="true" />
          )}

          {active.statement && (
            <Text as="p" variant="body" color="on-surface">
              {active.statement}
            </Text>
          )}
        </div>

        {/* Footer: Navigation + obere Haarlinie */}
        <div className={FOOTER_ROW}>
          <Button variant="outline" size="icon" aria-label="Vorheriger Beweis" onClick={goPrev} disabled={!canNavigate}>
            <Icon name="chevron-left" aria-hidden />
          </Button>
          <Button variant="outline" size="icon" aria-label="Nächster Beweis" onClick={goNext} disabled={!canNavigate}>
            <Icon name="chevron-right" aria-hidden />
          </Button>
        </div>
      </div>
    </div>
  );

  // Portal an document.body: das Overlay darf NICHT von einem transformierten
  // (`.reveal` nutzt `translate`/Animation) oder containenden Ancestor eingeengt
  // werden – sonst ist `position:fixed` nicht mehr viewport-relativ und die
  // Lightbox erscheint „unter dem Fold". Am body ist sie garantiert Fullscreen.
  return createPortal(overlay, document.body);
}
