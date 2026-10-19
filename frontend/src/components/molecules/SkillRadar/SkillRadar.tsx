import { getRadarColorImportance, getRadarColorLevel, getRadarColorLevelPublic } from '@src/components/charts/ChartShell/ChartShell.utils';
import RadarChart from '@src/components/charts/RadarChart/RadarChart';
import Text from '@src/components/primitives/Text';

import { MIN_SKILLS_FOR_RADAR, filterArchived, filterConfirmed, toRadarData } from './SkillRadar.logic';
import {
  skillRadarBarVariants,
  skillRadarChartVariants,
  skillRadarLevelVariants,
  skillRadarNameVariants,
  skillRadarRowVariants,
} from './SkillRadar.variants';

import type { SkillRadarProps } from './SkillRadar.interface';

/**
 * SkillRadar – Compact card showing importance vs. level for a skill group.
 *
 * Renders a RadarChart when the group has ≥ 3 confirmed skills with level,
 * otherwise falls back to a compact bar‑style text list. Clicking the chart
 * area fires ``onClick`` (parent opens a Dialog).
 */
export default function SkillRadar({ skills, label, onClick }: SkillRadarProps) {
  const confirmed = filterConfirmed(skills);
  const archived = filterArchived(skills);

  const showRadar = confirmed.length >= MIN_SKILLS_FOR_RADAR;
  const data = showRadar ? toRadarData(confirmed) : null;

  return (
    <div>
      <div className="mb-2">
        <Text as="span" size="xs" weight="medium" uppercase color="muted">
          {label} ({skills.length})
        </Text>
      </div>

      {showRadar && data ? (
        <div
          className={skillRadarChartVariants()}
          onClick={onClick}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter' && onClick) onClick(); }}
        >
          <RadarChart
            data={data}
            maxValue={5}
            showLegend={false}
            showTooltip={false}
            showSplitArea
            radars={[
              { dataKey: 'effective_importance', name: 'Importance', stroke: getRadarColorImportance(), fill: getRadarColorImportance(), fillOpacity: 0.1 },
              { dataKey: 'level', name: 'Level', stroke: getRadarColorLevel(), fill: getRadarColorLevel(), fillOpacity: 0.25 },
              { dataKey: 'level_public', name: 'Level (public)', stroke: getRadarColorLevelPublic(), fill: getRadarColorLevelPublic(), fillOpacity: 0.15 },
            ]}
          />
        </div>
      ) : confirmed.length > 0 ? (
        <div className="space-y-1">
          {confirmed.map((s) => (
            <div key={s.id} className={skillRadarRowVariants()}>
              <div className={skillRadarNameVariants()}>
                <Text as="span" size="xs">{s.name}</Text>
              </div>
              <div
                className={skillRadarBarVariants()}
                style={{ width: `${Math.min((s.effective_importance ?? 0) * 20, 100)}%` }}
              />
              <div className={skillRadarLevelVariants()}>
                <Text as="span" size="xs">{s.level ?? '–'}</Text>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <Text as="span" size="xs" color="muted">Keine Skills mit Level</Text>
      )}

      {archived.length > 0 && (
        <div className="mt-2">
          <Text as="span" size="xs" color="muted">
            {archived.map((s) => s.name).join(', ')}
          </Text>
        </div>
      )}
    </div>
  );
}

export type { SkillRadarVariants } from './SkillRadar.variants';
export type { SkillRadarProps } from './SkillRadar.interface';
