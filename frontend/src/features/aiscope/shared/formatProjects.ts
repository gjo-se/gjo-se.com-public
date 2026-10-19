/**
 * Maps normalised projects to the AdminProjects table-row shape (React nodes
 * for the inline status/merge cells).
 */
import { createElement } from 'react';

import StatusCell from '@src/components/atoms/StatusCell/StatusCell';
import Progress from '@src/components/primitives/Progress';
import Text from '@src/components/primitives/Text/Text';
import type { Project } from '@src/lib/api/aiscope';
import type { TaskStatus } from '@src/lib/api/aiscopeTasks';
import { formatDuration } from '@src/utils/projectFormatters';

import type { ProjectStatus } from '../core/types';
import type { ReactNode } from 'react';

/** En-dash placeholder for empty values. */
const PLACEHOLDER = '\u2013';

/** A single AdminProjects table row. */
export interface ProjectTableRow {
  id: number
  title: string
  city: string
  remotePercent: string
  jobRole: string
  duration: string
  postedAt: string
  linkedCount: ReactNode
  matchScore: string
  confirmedScore: string
  endcustomer: string
  hourlyRate: string
  status: ProjectStatus
  status_color_token: string | null
  statusCell: ReactNode
}

/** Formats an ISO timestamp as a German short date (or the placeholder). */
function formatPostedAt(value: string | null | undefined): string {
  if (!value) return PLACEHOLDER;
  return new Date(value).toLocaleDateString('de-DE', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  });
}

/** Maps API projects to table rows, deriving the merge-progress cell. */
export function formatProjects(
  items: Project[],
  mergeStatus?: Map<number, TaskStatus>,
  mergeElapsedMs?: number,
  avgMergeDurationMs?: number | null,
): ProjectTableRow[] {
  const estimatedMergeMs = avgMergeDurationMs ?? 60000;
  return items.map((item) => {
    const task = mergeStatus?.get(item.id);

    return {
      id: item.id,
      title: item.title.trim(),
      city: orPlaceholder(item.city),
      remotePercent: formatRemotePercent(item.remote_percent),
      jobRole: orPlaceholder(item.job_role_name),
      duration: formatDuration(item.duration),
      postedAt: formatPostedAt(item.posted_at),
      linkedCount: resolveLinkedCount(item, task, mergeElapsedMs, estimatedMergeMs),
      mergeDirty: item.merge_dirty,
      matchScore: formatScore(item.match_score),
      confirmedScore: formatScore(item.confirmed_score),
      endcustomer: item.endcustomer === true ? 'x' : PLACEHOLDER,
      hourlyRate: item.hourly_rate != null ? String(item.hourly_rate) : '',
      status: item.status,
      status_color_token: item.status_color_token,
      statusCell: createElement(StatusCell, {
        statusableType: 'project',
        statusableId: item.id,
        currentStatus: item.status,
        currentColor: item.status_color_token,
      }),
    };
  });
}

/** Formats a remote-percent value as `«n» %` (or the placeholder). */
function formatRemotePercent(value: number | null | undefined): string {
  return value != null ? `${value} %` : PLACEHOLDER;
}

/** Formats a score value as a rounded `«n»%` (or the placeholder). */
function formatScore(value: number | null | undefined): string {
  return value != null ? `${Math.round(value)}%` : PLACEHOLDER;
}

/** Returns the value, or the placeholder when it is `null`/`undefined`. */
function orPlaceholder(value: string | null | undefined): string {
  return value ?? PLACEHOLDER;
}

/**
 * Renders the linked-count cell of a project row.
 *
 * Merge lifecycle: failed → error count, running merge → progress bar,
 * finished merge → plain count, otherwise a dirty marker (amber) when the
 * project was scraped after the last merge.
 *
 * @param item Project of the row.
 * @param task Current merge task of the project (if any).
 * @param mergeElapsedMs Elapsed time of the running merge (ms).
 * @param estimatedMergeMs Expected merge duration (ms) for the progress bar.
 * @returns React node for the `linkedCount` column.
 */
function resolveLinkedCount(
  item: Project,
  task: TaskStatus | undefined,
  mergeElapsedMs: number | undefined,
  estimatedMergeMs: number,
): ReactNode {
  const count = (item.slave_count ?? 0) + 1;

  if (task?.status === 'failed') {
    return createElement(Text, { as: 'span', color: 'error' }, String(count));
  }

  const isActive = task && (task.status === 'running' || task.status === 'queued');
  const mergeDone = task && (task.status === 'done' || (task.phase === 'extract' && task.status === 'running'));

  // Merge-Phase läuft → Progress-Balken
  if (isActive && task?.phase === 'merge' && !mergeDone) {
    const pct = Math.min(100, Math.round(((mergeElapsedMs ?? 0) / estimatedMergeMs) * 100));
    return createElement(Progress, { value: pct, max: 100, size: 'md' });
  }

  // Merge abgeschlossen → sofort weiß (egal ob Extract noch läuft)
  if (mergeDone || task?.status === 'done') {
    return String(count);
  }

  // Default: amber wenn dirty
  const isDirty = !item.merged_at
    || (item.scraped_at != null && item.merged_at != null && item.scraped_at > item.merged_at);
  if (isDirty) {
    return createElement(Text, { as: 'span', color: 'warning-subtle' }, String(count));
  }

  return String(count);
}
