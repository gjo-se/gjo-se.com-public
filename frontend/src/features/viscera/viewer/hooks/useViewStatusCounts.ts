import { useMemo } from 'react';

import type { Diagram, Workspace } from '../../core/workspaceSchema';

// ── Types ─────────────────────────────────────────────────────────────────

export interface ViewStatusCounts {
  pending: number;
  scan_missing: number;
}

// ── Constants ─────────────────────────────────────────────────────────────

const TARGET_STATUSES = new Set(['viscera-pending', 'viscera-scan_missing']);

// ── Hook ──────────────────────────────────────────────────────────────────

/**
 * Counts objects with pending / scan_missing status per diagram.
 *
 * Reads the flat workspace.objects list, collects each object's status,
 * then matches each against the diagram's node map (R1: nodes are
 * diagram-only membership — `workspace.diagrams`).
 *
 * @returns Record<diagram.key, ViewStatusCounts> — only diagrams with >0 relevant objects
 */
export function useViewStatusCounts(
  workspace: Workspace | null,
): Record<string, ViewStatusCounts> {
  return useMemo(() => {
    if (!workspace) return {};

    const result: Record<string, ViewStatusCounts> = {};
    const { objects = [] } = workspace;
    const diagrams = (workspace.diagrams ?? []) as Diagram[];

    // Collect all objects with their status (flat list)
    const allObjects: { id: string; status: string }[] = objects.map((obj) => ({
      id: obj.id,
      status: obj.status ?? 'viscera-approved',
    }));

    diagrams.forEach((diagram) => {
      const counts: ViewStatusCounts = { pending: 0, scan_missing: 0 };
      const nodeIds = new Set(Object.keys(diagram.nodes ?? {}));

      allObjects.forEach((obj) => {
        if (!TARGET_STATUSES.has(obj.status)) return;
        if (!nodeIds.has(obj.id)) return;

        if (obj.status === 'viscera-pending') counts.pending += 1;
        else if (obj.status === 'viscera-scan_missing') counts.scan_missing += 1;
      });

      if (counts.pending > 0 || counts.scan_missing > 0) {
        result[diagram.key] = counts;
      }
    });

    return result;
  }, [workspace]);
}
