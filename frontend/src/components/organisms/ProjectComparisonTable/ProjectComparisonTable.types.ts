/**
 * Props + row/link types for the ProjectComparisonTable organism.
 */
import type { CallLogMeta } from '@src/lib/api/aiscope';
import type { ComparisonColumn, ProjectStatus } from '@src/lib/api/aiscopeTypes';

import type { ReactNode } from 'react';

/** Linked CRM ids for the canonical project (null when not enriched). */
export interface CrmLinks {
  linkId: number | null;
  companyId: number | null;
  companyName: string | null;
  personId: number | null;
  personName: string | null;
}

/** Props of the ProjectComparisonTable organism. */
export interface ProjectComparisonTableProps {
  columns: ComparisonColumn[];
  loading?: boolean;
  error?: string | null;
  /** Called after a successful set-canonical action to reload data. */
  onRefetch: () => void;
  /** The canonical project ID (for adding new slaves). */
  canonicalProjectId?: number;
  /** Current exclusive status of the master project (for the status cell). */
  status?: ProjectStatus | null;
  /** Color token of the master project's current status (for the status cell). */
  statusColor?: string | null;
  /** LLM-merged German summary of the master project (Markdown). */
  mergedDescription?: string | null;
  /** Whether the merged summary is stale and should be (re-)generated. */
  mergeDirty?: boolean;
  /** Whether a merge is currently running. */
  merging?: boolean;
  /** Live-streamed merge text while merging. */
  streamingText?: string | null;
  /** Metadata of the most recent merge call (call_log_id). */
  callLogMeta?: CallLogMeta | null;
  /** Triggers an on-demand merge of the whole group. */
  onMerge?: () => void;
  /** Called after score recalculation with the new scores (avoids full page reload). */
  onScoreChange?: (matchScore: number | null, confirmedScore: number | null, publicScore: number | null) => void;
  /** Free-text notes of the canonical project (Markdown source). */
  notes?: string | null;
}

/** A single metadata row definition. */
export interface RowDef {
  label: string;
  render: (col: ComparisonColumn) => ReactNode;
}
