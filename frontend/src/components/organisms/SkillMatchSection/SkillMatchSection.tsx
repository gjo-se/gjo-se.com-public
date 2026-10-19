import ColorSwatch from '@src/components/atoms/ColorSwatch/ColorSwatch';
import Content from '@src/components/atoms/Content/Content';
import RadarChart from '@src/components/charts/RadarChart/RadarChart';
import HeroFooter from '@src/components/molecules/HeroFooter/HeroFooter';
import HeroCanvas from '@src/components/primitives/HeroCanvas';
import Text from '@src/components/primitives/Text';
import { useElementSize } from '@src/hooks/useElementWidth';

import { MATCH_SLIDE_ID } from '../SkillGroupRadarModal/SkillGroupRadarModal.logic';

import {
  MIN_SKILLS_FOR_RADAR,
  getRadarColorImportance,
  getRadarColorLevel,
  toCardData,
  toRadarData,
} from './SkillMatchSection.logic';
import { HERO_ASPECT_RATIO } from './SkillMatchSection.utils';
import { matchRadarButtonVariants, matchRadarFallbackVariants } from './SkillMatchSection.variants';

import type { SkillMatchSectionProps } from './SkillMatchSection.interface';

/**
 * SkillMatchSection – prominente Match-Sektion des Bewerbungs-Proofs als Hero.
 *
 * Kino-Format 21:9 (geteilte `HeroCanvas`-Grundlage – identisch zur Portfolio-Seite):
 * Das Radar füllt die Fläche unverschattet, die Skill-Namen stehen als Achsenlabels
 * direkt am Chart. Die Farb-Legende (Importance orange / Level blau) liegt als Overlay
 * in der Canvas (unten links) und ist optisch identisch zu den Achsenbeschriftungen.
 * Klick auf das Radar feuert `onOpenSlide(MATCH_SLIDE_ID)` – die Page-Lightbox
 * (alle Slides inkl. aller Gruppen) übernimmt.
 */
export type { SkillMatchSectionProps } from './SkillMatchSection.interface';
export type { SkillMatchSectionVariants } from './SkillMatchSection.variants';

export default function SkillMatchSection({ skills, onOpenSlide, title, subtitle }: SkillMatchSectionProps) {
  const [heroRef, heroSize] = useElementSize<HTMLDivElement>();
  const showRadar = skills.length >= MIN_SKILLS_FOR_RADAR;

  // Radar-Höhe an die reale Container-Höhe koppeln (ResizeObserver),
  // damit das Radar die 21:9-Fläche vollständig füllt – auch bei min-h-Überhöhung.
  const radarHeight = Math.max(heroSize.height, Math.round(heroSize.width * HERO_ASPECT_RATIO));

  // Sprachneutrale Legende – das Radar spricht für sich (Importance / Level).
  // Render-Zeit-Auflösung der Token-Farben (kein Modul-Caching).
  const legendItems = [
    { label: 'Importance', color: getRadarColorImportance() },
    { label: 'Level', color: getRadarColorLevel() },
  ];

  return (
    <HeroCanvas
      innerRef={heroRef}
      footer={<HeroFooter title={title} subtitle={subtitle} />}
    >
      {showRadar ? (
        <div
          className={matchRadarButtonVariants()}
          onClick={() => onOpenSlide(MATCH_SLIDE_ID)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter') onOpenSlide(MATCH_SLIDE_ID); }}
          aria-label="Match-Radar vergrößern"
        >
          <RadarChart
            data={toRadarData(toCardData(skills))}
            maxValue={5}
            height={radarHeight}
            showLegend={false}
            showTooltip={false}
            radars={[
              { dataKey: 'importance', name: 'Importance', stroke: getRadarColorImportance(), fill: getRadarColorImportance(), fillOpacity: 0.1 },
              { dataKey: 'level_public', name: 'Level', stroke: getRadarColorLevel(), fill: getRadarColorLevel(), fillOpacity: 0.25 },
            ]}
          />
        </div>
      ) : (
        <div className={matchRadarFallbackVariants()}>
          <Text as="span" size="sm" color="muted">
            <Content id="skills.fallback.tooFew" inline />
          </Text>
        </div>
      )}

      {/* Farb-Legende als Overlay in der Canvas (unten links) – ohne BG, wie die Achsenlabels */}
      <div className="absolute bottom-0 left-0 flex flex-wrap items-center gap-x-5 gap-y-2 p-4 sm:p-6">
        {legendItems.map((item) => (
          <div key={item.label} className="inline-flex items-center gap-2">
            <ColorSwatch color={item.color} size="sm" />
            <Text as="span" size="xs">{item.label}</Text>
          </div>
        ))}
      </div>
    </HeroCanvas>
  );
}
