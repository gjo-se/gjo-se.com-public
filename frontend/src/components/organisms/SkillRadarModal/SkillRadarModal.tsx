import { useEffect, useState } from 'react';

import Button from '@src/components/primitives/Button';
import Dialog, { DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@src/components/primitives/Dialog';
import Text from '@src/components/primitives/Text';

import RadarChart from '../../charts/RadarChart/RadarChart';
import { filterConfirmed, toRadarData } from '../../molecules/SkillRadar/SkillRadar.logic';

import { CHART_MOUNT_DELAY_MS, MIN_SKILLS_FOR_RADAR, RADAR_HEIGHT, getArchivedRadars, getDefaultRadars } from './SkillRadarModal.utils';

import type { SkillRadarModalProps } from './SkillRadarModal.interface';

export type { SkillRadarModalProps } from './SkillRadarModal.interface';

/**
 * SkillRadarModal – Full-size radar chart for a skill group, rendered inside a
 * wide dialog. The chart is mounted only after the dialog's open animation
 * completes so Recharts' ResponsiveContainer measures a stable, fully-sized
 * container instead of a mid-animation element (which collapses the chart).
 */
export default function SkillRadarModal({ open, onOpenChange, label, skills, variant = 'default' }: SkillRadarModalProps) {
  const [chartReady, setChartReady] = useState(false);
  const isArchived = variant === 'archived';
  const effectiveSkills = isArchived ? skills : filterConfirmed(skills);
  const showRadar = effectiveSkills.length >= MIN_SKILLS_FOR_RADAR;
  const radars = isArchived ? getArchivedRadars() : getDefaultRadars();

  // Reset the chart latch when the dialog closes (adjusting state during render).
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    setChartReady(false);
  }

  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => setChartReady(true), CHART_MOUNT_DELAY_MS);
    return () => clearTimeout(timer);
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="2xl">
        <DialogHeader>
          <DialogTitle>{label} – Skills ({skills.length})</DialogTitle>
        </DialogHeader>
        {showRadar ? (
          <div style={{ minHeight: RADAR_HEIGHT, width: '100%' }}>
            {chartReady && (
              <RadarChart
                data={toRadarData(effectiveSkills)}
                maxValue={5}
                height={RADAR_HEIGHT}
                showLegend={false}
                showTooltip={false}
                showSplitArea
                radars={radars}
              />
            )}
          </div>
        ) : (
          <Text as="span" size="sm" color="muted">Zu wenige Skills für Radar.</Text>
        )}
        <DialogFooter>
          <Button variant="secondary" size="sm" onClick={() => onOpenChange(false)}>
            Schließen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
