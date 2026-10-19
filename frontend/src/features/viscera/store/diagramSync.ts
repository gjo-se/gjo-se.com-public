import { z } from 'zod';

import type { SyncAction, SyncQueueEntry } from './diagramSliceTypes';

/**
 * Diagram lifecycle statuses (viscera-* slugs, mirrors backend #2262).
 * Default is ``viscera-approved``; a fresh diagram starts approved.
 */
export const diagramStatusSchema = z.enum([
  'viscera-approved',
  'viscera-pending',
  'viscera-planned',
  'viscera-scan_missing',
  'viscera-deprecated',
  'viscera-rejected',
]);

/**
 * Builds a new sync queue entry with a fresh mutation id.
 *
 * New entries start with ``retryCount: 0`` and ``status: 'pending'``.
 */
export function buildSyncEntry(
  nodeId: string,
  action: SyncAction,
  payload: Record<string, unknown>,
): SyncQueueEntry {
  return {
    mutationId: generateMutationId(),
    nodeId,
    action,
    payload,
    retryCount: 0,
    status: 'pending',
  };
}

/**
 * Generates a unique mutation id via ``crypto.randomUUID`` when available.
 *
 * Falls back to a timestamp-based id for environments without ``crypto``
 * (e.g. older Node versions in tests).
 */
function generateMutationId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for environments without crypto (e.g. older Node versions in tests)
  return `mutation-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
