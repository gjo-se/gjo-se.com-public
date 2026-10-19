import ColorSwatch from '@src/components/atoms/ColorSwatch/ColorSwatch';
import RadarChart from '@src/components/charts/RadarChart/RadarChart';
import Text from '@src/components/primitives/Text';
import { useElementSize } from '@src/hooks/useElementWidth';

import {
  MIN_SKILLS_FOR_RADAR,
  getRadarColorImportance,
  getRadarColorLevel,
  toRadarData,
  topSkillsByImportance,
} from '../../molecules/SkillGroupRadar/SkillGroupRadar.logic';

import { HERO_TOP_N } from './SkillGroupHero.utils';
import {
  heroGridVariants,
  heroLegendVariants,
  heroRadarButtonVariants,
  heroRadarFallbackVariants,
  heroRadarFrameVariants,
  heroSublineVariants,
  heroUspVariants,
} from './SkillGroupHero.variants';

import type { SkillGroupHeroProps } from './SkillGroupHero.interface';

/**
 * SkillGroupHero – Hero der Skills-Seite als Radar-Inszenierung (Dummy C).
 *
 * Zwei-Spalten-Layout direkt auf der Surface-Fläche: Links eine Serif-H1 (Content-Key mit
 * Dummy-Fallback), Mono/USP-Zeile und Lead-Subline. Rechts füllt der quadratische Radar die
 * Top-7 der übergebenen Skills (`skills`) – auf `/skills` die wichtigste Gruppe, im
 * Proof-Modus (`/skills/<id>`) die Projekt-Skills. Darunter die Farb-Legende
 * (Importance/Level). Klick auf den Radar feuert `onOpenSlide(openSlideTarget)` – die
 * Page-Lightbox übernimmt. Beide Routen teilen exakt diese Seite.
 */
export type { SkillGroupHeroProps } from './SkillGroupHero.interface';
export type { SkillGroupHeroVariants } from './SkillGroupHero.variants';

export default function SkillGroupHero({
  skills,
  onOpenSlide,
  openSlideTarget,
  title,
  usp,
  subline,
}: SkillGroupHeroProps) {
  // Radar-Höhe an die reale Breite koppeln (ResizeObserver), damit das Radar im
  // quadratischen 1:1-Feld steht – die Breite des Containers ist die Seitenlänge.
  const [radarRef, radarSize] = useElementSize<HTMLDivElement>();
  const radarSide = radarSize.width > 0 ? radarSize.width : 400;

  const radarSkills = topSkillsByImportance(skills, HERO_TOP_N);
  const showRadar = radarSkills.length >= MIN_SKILLS_FOR_RADAR;

  // Sprachneutrale Legende – das Radar spricht für sich (Importance / Level).
  // Render-Zeit-Auflösung der Token-Farben (kein Modul-Caching).
  const legendItems = [
    { label: 'Importance (Soll)', color: getRadarColorImportance() },
    { label: 'Level (Ist)', color: getRadarColorLevel() },
  ];

  return (
    <section
      id="skills-hero"
      aria-labelledby="skills-hero-title"
      className="border-b border-border-light py-hero-y"
    >
      <div className={heroGridVariants()}>
        {/* Text-Spalte */}
        <div>
          <Text
            as="h1"
            id="skills-hero-title"
            variant="display"
          >
            {title}
          </Text>

          {usp && (
            <div className={heroUspVariants()}>
              <Text as="p" variant="usp" weight="medium">
                {usp}
              </Text>
            </div>
          )}

          {subline && (
            <div className={heroSublineVariants()}>
              <Text as="p" variant="lead-lg">
                {subline}
              </Text>
            </div>
          )}
        </div>

        {/* Radar-Spalte: quadratischer Radar + Legende darunter */}
        <div>
          <div ref={radarRef} className={heroRadarFrameVariants()}>
            {showRadar ? (
              <div
                className={heroRadarButtonVariants()}
                onClick={() => onOpenSlide(openSlideTarget)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter') onOpenSlide(openSlideTarget); }}
                aria-label="Radar vergrößern"
              >
                <RadarChart
                  data={toRadarData(radarSkills)}
                  maxValue={5}
                  height={radarSide}
                  showLegend={false}
                  showTooltip={false}
                  radars={[
                    { dataKey: 'importance', name: 'Importance', stroke: getRadarColorImportance(), fill: getRadarColorImportance(), fillOpacity: 0.1 },
                    { dataKey: 'level_public', name: 'Level', stroke: getRadarColorLevel(), fill: getRadarColorLevel(), fillOpacity: 0.25 },
                  ]}
                />
              </div>
            ) : (
              <div className={heroRadarFallbackVariants()}>
                <Text as="span" size="sm" color="muted">
                  Zu wenige Skills für den Radar.
                </Text>
              </div>
            )}
          </div>

          <div className={heroLegendVariants()}>
            {legendItems.map((item) => (
              <div key={item.label} className="inline-flex items-center gap-2">
                <ColorSwatch color={item.color} size="md" />
                <Text as="span" variant="meta" size="xs" color="secondary">
                  {item.label}
                </Text>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
