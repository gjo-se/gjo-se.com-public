import { getRadarColorImportance, getRadarColorLevel, getRadarColorLevelPublic } from '../../charts/ChartShell/ChartShell.utils';

export const MIN_SKILLS_FOR_RADAR = 3;

export const RADAR_HEIGHT = 480;

/** Dialog open animation is 100ms; wait a bit longer before mounting the chart. */
export const CHART_MOUNT_DELAY_MS = 200;

export function getArchivedRadars() {
  return [
    { dataKey: 'effective_importance', name: 'Importance', stroke: getRadarColorImportance(), fill: getRadarColorImportance(), fillOpacity: 0.1 },
  ];
}

/** Serien-Farben aus der zentralen Radar-Semantik (ChartShell.utils) – einzig gültig. */
export function getDefaultRadars() {
  return [
    { dataKey: 'effective_importance', name: 'Importance', stroke: getRadarColorImportance(), fill: getRadarColorImportance(), fillOpacity: 0.1 },
    { dataKey: 'level', name: 'Level', stroke: getRadarColorLevel(), fill: getRadarColorLevel(), fillOpacity: 0.25 },
    { dataKey: 'level_public', name: 'Level (public)', stroke: getRadarColorLevelPublic(), fill: getRadarColorLevelPublic(), fillOpacity: 0.15 },
  ];
}
