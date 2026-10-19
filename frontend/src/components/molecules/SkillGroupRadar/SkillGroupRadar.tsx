import Content from '@src/components/atoms/Content/Content';
import RadarChart from '@src/components/charts/RadarChart/RadarChart';
import SkillGroupLabel from '@src/components/molecules/SkillGroupLabel/SkillGroupLabel';
import Text from '@src/components/primitives/Text';
import { useElementSize } from '@src/hooks/useElementWidth';

import { CARD_ASPECT_RATIO, toCardData, toRadarData, getRadarColorImportance, getRadarColorLevel, MIN_SKILLS_FOR_RADAR } from './SkillGroupRadar.logic';
import { skillGroupRadarFallbackVariants } from './SkillGroupRadar.variants';

import type { SkillGroupRadarProps } from './SkillGroupRadar.interface';

/**
 * SkillGroupRadar – Radar-Karte einer Skill-Gruppe (Public, Tag site:public).
 * Zeigt Top-7-Skills nach Importance (orange) vs. Gregs Level (blau), maxValue 5.
 * Klick auf die Chart-Fläche feuert `onClick` (Parent öffnet die Lightbox).
 *
 * Karten-Proportion wie die Portfolio-ProofCard: `fullWidth` (high) = 21:9,
 * medium = 4:3. Die Radar-Höhe wird an die reale Container-Höhe gekoppelt
 * (ResizeObserver), damit das Chart die aspect-Fläche vollständig füllt.
 */
export default function SkillGroupRadar({
  label,
  skills,
  onClick,
  fullWidth = false,
  base = false,
}: SkillGroupRadarProps) {
  const showRadar = skills.length >= MIN_SKILLS_FOR_RADAR;
  const [chartRef, chartSize] = useElementSize<HTMLDivElement>();

  // Radar-Höhe an die reale Container-Höhe koppeln (initialer Fallback über die Breite),
  // damit das Radar die aspect-Fläche vollständig füllt – auch bei min-h-Überhöhung.
  const radarHeight = Math.max(chartSize.height, Math.round(chartSize.width * CARD_ASPECT_RATIO));
  const radarProps = base ? 'opacity-75 saturate-[0.75] hover:border-border' : '';

  return (
    <div
      ref={chartRef}
      className={[
        'relative cursor-pointer overflow-hidden rounded border border-border hover:border-ring',
        fullWidth ? 'aspect-[21/9]' : 'aspect-[4/3]',
        // base (Basis-Stufe): dezimierte Optik – gedämpfter Kontrast, kein Hover-Ring.
        radarProps,
      ].join(' ')}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' && onClick) onClick(); }}
    >
      <SkillGroupLabel label={label} />
      {showRadar ? (
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
      ) : (
        <div className={skillGroupRadarFallbackVariants()}>
          <Text as="span" size="sm" color="muted">
            <Content id="skills.fallback.tooFew" inline />
          </Text>
        </div>
      )}
    </div>
  );
}

export type { SkillGroupRadarVariants } from './SkillGroupRadar.variants';
export type { SkillGroupRadarProps } from './SkillGroupRadar.interface';
