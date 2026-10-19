/**
 * ProjectMergeCell – Inline merge/extract progress indicator for the project table.
 *
 * Used inside the linkedCount and jobRole columns during bulk merge.
 * No new column – it overlays on existing ones.
 */
import Text from '@src/components/primitives/Text';
import type { TaskStatus } from '@src/lib/api/aiscopeTasks';

import { phaseBlocks } from './ProjectMergeCell.utils';

export interface ProjectMergeCellProps {
  /** The task status for this project, or undefined if no active task. */
  status?: TaskStatus;
  /** Which phase to render: "merge" or "extract". */
  phase: 'merge' | 'extract';
  /** The original cell value to show when no merge is active. */
  fallback: string;
}

/** Inline progress indicator: "██░░" for running, "██" for done. */
export default function ProjectMergeCell({ status, phase, fallback }: ProjectMergeCellProps) {
  if (!status || status.status === 'failed') {
    return <Text as="span" size="sm">{fallback}</Text>;
  }

  if (status.status === 'done') {
    // Task complete – show original value
    return <Text as="span" size="sm">{fallback}</Text>;
  }

  // Task running – show progress for the current phase
  const isCurrentPhase = status.phase === phase;
  const isPhaseDone = !isCurrentPhase && status.phase !== undefined;
  // Phase is "done" if the task moved past it (e.g., running extract means merge is done)
  const phaseDone = isPhaseDone || (isCurrentPhase ? false : status.phase === 'extract' && phase === 'merge');

  if (phaseDone) {
    return <Text as="span" size="sm" color="success">██</Text>;
  }

  if (isCurrentPhase) {
    return <Text as="span" size="sm" color="muted">{phaseBlocks(false)}</Text>;
  }

  return <Text as="span" size="sm">{fallback}</Text>;
}
