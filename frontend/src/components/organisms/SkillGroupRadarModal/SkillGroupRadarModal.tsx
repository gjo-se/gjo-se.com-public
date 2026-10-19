import { useCallback, useState } from 'react';

import ColorSwatch from '@src/components/atoms/ColorSwatch/ColorSwatch';
import Content from '@src/components/atoms/Content/Content';
import Button from '@src/components/primitives/Button';
import Icon from '@src/components/primitives/Icon/Icon';
import Text from '@src/components/primitives/Text';
import { useCarouselNavigation } from '@src/hooks/useCarouselNavigation';
import { useElementSize } from '@src/hooks/useElementWidth';

import RadarChart from '../../charts/RadarChart/RadarChart';
import { toRadarData, MIN_SKILLS_FOR_RADAR, getRadarColorImportance, getRadarColorLevel } from '../../molecules/SkillGroupRadar/SkillGroupRadar.logic';

import { FALLBACK_TITLE, RADAR_MIN_HEIGHT } from './SkillGroupRadarModal.utils';
import {
  radarModalBodyVariants,
  radarModalFooterVariants,
  radarModalHeaderVariants,
  radarModalLegendVariants,
  radarModalOverlayVariants,
  radarModalPanelVariants,
} from './SkillGroupRadarModal.variants';

import type { SkillGroupRadarModalProps } from './SkillGroupRadarModal.interface';

/**
 * SkillGroupRadarModal – Carousel-Lightbox über alle Skill-Gruppen, exakt nach Dummy C.
 *
 * Eigenes Overlay (statt DialogContent, das eigene Panel-Tokens erzwingt): Hintergrund =
 * Surface mit Blur, Panel `bg-surface` + border-light + shadow, Header (Serif-Titel |
 * Zähler mittig | Schließen) mit unterer Haarlinie, Body mit großem Radar, Footer mit
 * oberer Haarlinie: Navigation (Prev/Next) links, Legende rechts. Esc/Backdrop schließen.
 */
export type { SkillGroupRadarModalProps } from './SkillGroupRadarModal.interface';
export type { SkillGroupRadarModalVariants } from './SkillGroupRadarModal.variants';

export default function SkillGroupRadarModal({
  open,
  onOpenChange,
  groups,
  initialGroupId,
}: SkillGroupRadarModalProps) {
  const count = groups.length;

  const close = useCallback(() => onOpenChange(false), [onOpenChange]);

  const { activeIndex, setActiveIndex, goPrev, goNext } = useCarouselNavigation({
    count,
    isOpen: open,
    onClose: close,
    initialIndex: Math.max(0, groups.findIndex((g) => g.id === initialGroupId)),
  });

  // ── Carousel-Index – beim Öffnen der geklickten Gruppe zurücksetzen (render-time adjust) ──
  const [prevGroupId, setPrevGroupId] = useState(initialGroupId);

  if (initialGroupId !== prevGroupId) {
    setPrevGroupId(initialGroupId);
    if (open) {
      const idx = groups.findIndex((g) => g.id === initialGroupId);
      setActiveIndex(idx >= 0 ? idx : 0);
    }
  }

  const active = groups[activeIndex] ?? null;
  const [radarRef, radarSize] = useElementSize<HTMLDivElement>();

  if (!open || !active) return null;

  const showRadar = active.skills.length >= MIN_SKILLS_FOR_RADAR;
  const radarHeight = Math.max(radarSize.height, RADAR_MIN_HEIGHT);
  const canNavigate = count > 1;
  const title = active.label ?? FALLBACK_TITLE;

  // Legende wie Dummy: Importance = Salbei (chart-4), Level = Kupfer (chart-1).
  const legendItems = [
    { label: 'Importance (Soll)', color: getRadarColorImportance() },
    { label: 'Level (Ist)', color: getRadarColorLevel() },
  ];

  return (
    <div
      className={radarModalOverlayVariants()}
      role="dialog"
      aria-modal="true"
      aria-label="Radar-Detailansicht"
      onClick={(e) => { if (e.target === e.currentTarget) close(); }}
    >
      {/* Panel – exakt Dummy .lightbox__panel */}
      <div className={radarModalPanelVariants()}>
        {/* Header: Titel | Zähler (mittig) | Schließen + untere Haarlinie */}
        <div className={radarModalHeaderVariants()}>
          <Text as="h2" variant="headline">
            {title}
          </Text>

          <Text as="span" variant="meta" color="secondary">
            {activeIndex + 1} / {count}
          </Text>

          <Button
            variant="ghost"
            size="icon"
            aria-label="Schließen"
            onClick={close}
          >
            <Icon name="x" aria-hidden />
          </Button>
        </div>

        {/* Body: Radar füllt den Bereich (Dummy .lightbox__body/.lightbox__radar) */}
        <div ref={radarRef} className={radarModalBodyVariants()}>
          {showRadar ? (
            <RadarChart
              key={activeIndex}
              data={toRadarData(active.skills)}
              maxValue={5}
              height={radarHeight}
              showLegend={false}
              showTooltip={false}
              radars={[
                { dataKey: 'importance', name: 'Importance', stroke: getRadarColorImportance(), fill: getRadarColorImportance(), fillOpacity: 0.1 },
                { dataKey: 'level_public', name: 'Level', stroke: getRadarColorLevel(), fill: getRadarColorLevel(), fillOpacity: 0.25 },
              ]}
            />
          ) : (
            <div className="flex items-center justify-center py-24">
              <Text as="span" size="sm" color="muted">
                <Content id="skills.fallback.tooFew" inline />
              </Text>
            </div>
          )}
        </div>

        {/* Footer: Navigation links, Legende rechts + obere Haarlinie */}
        <div className={radarModalFooterVariants()}>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              aria-label="Vorherige Gruppe"
              onClick={goPrev}
              disabled={!canNavigate}
            >
              <Icon name="chevron-left" aria-hidden />
            </Button>
            <Button
              variant="outline"
              size="icon"
              aria-label="Nächste Gruppe"
              onClick={goNext}
              disabled={!canNavigate}
            >
              <Icon name="chevron-right" aria-hidden />
            </Button>
          </div>

          <div className={radarModalLegendVariants()}>
            {legendItems.map((item) => (
              <div key={item.label} className="inline-flex items-center gap-1.5">
                <ColorSwatch color={item.color} size="md" />
                <Text as="span" variant="meta" size="xs" color="secondary">
                  {item.label}
                </Text>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
