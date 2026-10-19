import { isAxiosError } from 'axios';
import { useCallback, useEffect, useRef } from 'react';
import { toast } from 'sonner';

import { api } from '@src/lib/api/axios';

import { useVisceraStore } from '../../store/visceraStore';

import type { DiagramSource } from '../../core/workspaceSchema';
import type { SyncQueueEntry } from '../../store/diagramSlice';

// ── Constants ────────────────────────────────────────────────────────────────

const MAX_RETRIES = 3;

const RETRY_DELAYS_MS = [300, 900, 2700] as const;

const ERROR_TOAST_MESSAGE = 'Änderung konnte nicht gespeichert werden';

// ── Helpers ──────────────────────────────────────────────────────────────────

type ApiDispatcher = (entry: SyncQueueEntry) => Promise<void>;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Extracts a human-readable message from an API/network error. */
function extractErrorMessage(err: unknown): string {
  if (isAxiosError(err)) {
    const detail = (err.response?.data as { detail?: string } | undefined)?.detail;
    if (detail) return detail;
    return err.message;
  }
  return err instanceof Error ? err.message : 'Unbekannter Fehler';
}

// ── API Dispatchers ──────────────────────────────────────────────────────────

function isNetworkError(err: unknown): boolean {
  return isAxiosError(err) && !err.response;
}

/**
 * Axios config that routes a write to the active architecture world.
 * `code` is the default (no query param, backwards compatible); any other
 * source appends `?source=<world>` so the write lands in the right tree.
 */
function writeConfig(): { params: { source: DiagramSource } } | undefined {
  const source = useVisceraStore.getState().source;
  return source === 'code' ? undefined : { params: { source } };
}

const dispatchers: Record<string, ApiDispatcher> = {
  create: async (entry) => {
    await api.post('/admin/viscera/nodes', entry.payload, writeConfig());
  },
  update: async (entry) => {
    await api.put(`/admin/viscera/nodes/${entry.nodeId}`, entry.payload, writeConfig());
  },
  delete: async (entry) => {
    await api.delete(`/admin/viscera/nodes/${entry.nodeId}`, writeConfig());
  },
  create_edge: async (entry) => {
    await api.post('/admin/viscera/edges', entry.payload, writeConfig());
  },
  delete_edge: async (entry) => {
    await api.delete(`/admin/viscera/edges/${entry.nodeId}`, writeConfig());
  },
  update_edge: async (entry) => {
    await api.put(`/admin/viscera/edges/${entry.nodeId}`, entry.payload, writeConfig());
  },
  create_diagram: async (entry) => {
    await api.post('/admin/viscera/diagrams', entry.payload, writeConfig());
  },
  delete_diagram: async (entry) => {
    await api.delete(`/admin/viscera/diagrams/${entry.nodeId}`, writeConfig());
  },

  update_diagram: async (entry) => {
    const payload = entry.payload as Record<string, unknown>;
    const key = payload.key as string;
    const body = { ...payload };
    delete body.key;
    await api.put(`/admin/viscera/diagrams/${key}`, body, writeConfig());
  },

  move: async (entry) => {
    const payload = entry.payload as Record<string, unknown>;
    const diagramKey = payload.diagramKey as string;
    const body: Record<string, unknown> = { x: payload.x, y: payload.y };
    // Group bounds are optional — only sent when present (#2293).
    if (payload.width !== undefined) body.width = payload.width;
    if (payload.height !== undefined) body.height = payload.height;
    // Node-description override (derived L3/L4 curation) — only sent when present
    // (#2492); the BE writes it as `nodes.<id>.description` on non-None (#2467).
    if (payload.description !== undefined) body.description = payload.description;
    await api.put(`/admin/viscera/diagrams/${diagramKey}/nodes/${entry.nodeId}`, body, writeConfig());
  },

  // ── Field-Level Mutation Dispatchers (#2200) ─────────────────────────────

  status_change: async (entry) => {
    await api.put(`/admin/viscera/nodes/${entry.nodeId}`, {
      field: 'status',
      value: (entry.payload as Record<string, unknown>).status,
    }, writeConfig());
  },

  tags_change: async (entry) => {
    await api.put(`/admin/viscera/nodes/${entry.nodeId}`, {
      field: 'tags',
      value: (entry.payload as Record<string, unknown>).tags,
    }, writeConfig());
  },

  tech_change: async (entry) => {
    await api.put(`/admin/viscera/nodes/${entry.nodeId}`, {
      field: 'technologies',
      value: (entry.payload as Record<string, unknown>).technologies,
    }, writeConfig());
  },

  annotation_add: async (entry) => {
    await api.put(`/admin/viscera/nodes/${entry.nodeId}`, {
      field: 'annotations',
      value: (entry.payload as Record<string, unknown>).annotations,
    }, writeConfig());
  },

  annotation_update: async (entry) => {
    await api.put(`/admin/viscera/nodes/${entry.nodeId}`, {
      field: 'annotations',
      value: (entry.payload as Record<string, unknown>).annotations,
    }, writeConfig());
  },

  annotation_delete: async (entry) => {
    await api.put(`/admin/viscera/nodes/${entry.nodeId}`, {
      field: 'annotations',
      value: (entry.payload as Record<string, unknown>).annotations,
    }, writeConfig());
  },

  field_update: async (entry) => {
    const payload = entry.payload as Record<string, unknown>;
    // R7-Write-Normalisierung (einzige Stelle): FE-Kanon `store` → BE-Kanon `data_store`.
    const value =
      payload.field === 'type' && payload.value === 'store'
        ? 'data_store'
        : payload.value;
    await api.put(`/admin/viscera/nodes/${entry.nodeId}`, {
      field: payload.field,
      value,
    }, writeConfig());
  },

  persist_layout: async (entry) => {
    const payload = entry.payload as Record<string, unknown>;
    const diagramKey = payload.diagramKey as string;
    // Entries may carry optional group bounds (width/height, #2293) — passed through unchanged.
    const nodes = payload.nodes as Record<string, { x: number; y: number; width?: number; height?: number }>;
    await api.put(`/admin/viscera/diagrams/${diagramKey}/nodes`, { nodes }, writeConfig());
  },

  group_members: async (entry) => {
    const payload = entry.payload as { groupId: string; add?: string[]; remove?: string[] };
    const body: { add?: string[]; remove?: string[] } = {};
    if (payload.add?.length) body.add = payload.add;
    if (payload.remove?.length) body.remove = payload.remove;
    await api.put(`/admin/viscera/groups/${payload.groupId}/members`, body, writeConfig());
  },

  create_group: async (entry) => {
    await api.post('/admin/viscera/groups', entry.payload, writeConfig());
  },

  update_group: async (entry) => {
    const payload = entry.payload as { name?: string; description?: string };
    const body: { name?: string; description?: string } = {};
    if (payload.name !== undefined) body.name = payload.name;
    if (payload.description !== undefined) body.description = payload.description;
    await api.put(`/admin/viscera/groups/${entry.nodeId}`, body, writeConfig());
  },

  delete_group: async (entry) => {
    await api.delete(`/admin/viscera/groups/${entry.nodeId}`, writeConfig());
  },
};

// ── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Attempts to execute a dispatcher with retry logic.
 *
 * Only retries on network errors (``isAxiosError && !err.response``).
 * Server errors (4xx, 5xx with response) fail immediately without retry.
 *
 * @param onFinalError Invoked with the last error when the entry finally fails
 *   (non-network error or exhausted retries). Used to persist error details.
 * @returns ``true`` if the call succeeded, ``false`` after exhausting all retries.
 */
async function attemptWithRetry(
  entry: SyncQueueEntry,
  dispatcher: ApiDispatcher,
  onFinalError?: (err: unknown) => void,
): Promise<boolean> {
  let attempt = entry.retryCount;

  while (attempt < MAX_RETRIES) {
    try {
      await dispatcher(entry);
      return true;
    } catch (err: unknown) {
      if (!isNetworkError(err) || attempt >= MAX_RETRIES - 1) {
        // Non-network errors (4xx, 5xx with response) — no retry.
        // Network error without remaining attempts — retries exhausted.
        onFinalError?.(err);
        return false;
      }
      attempt += 1;
      const delayMs = RETRY_DELAYS_MS[attempt - 1] ?? 2700;
      await delay(delayMs);
      useVisceraStore.getState().updateSyncEntry(entry.mutationId, {
        retryCount: attempt,
        status: 'retrying',
      });
    }
  }

  return false;
}

// ── Retry Logic (exported for testing) ───────────────────────────────────────

/**
 * Subscribes to ``diagramSlice.syncQueue`` and processes pending mutations
 * asynchronously with fire-and-forget semantics.
 *
 * - Sequential processing (only one API call at a time — prevents YAML race conditions)
 * - Retry: up to 3 attempts with exponential backoff (300ms → 900ms → 2700ms)
 *   on network errors only (``isAxiosError && !err.response``)
 * - On success: removes entry from queue and clears transient flag
 * - On final failure: shows error toast and marks entry as ``failed``
 *
 * Must be called once at the Viscera canvas level (e.g. ``VisceraViewsPage``).
 */
export function useSyncService(): void {
  const processingRef = useRef(false);
  const scheduledRef = useRef(false);

  /**
   * Processes the queue continuously until no pending entries remain.
   * Uses a ref-based lock to prevent concurrent processing loops.
   * Re-entrant calls (while already processing) set a flag ensuring
   * a follow-up cycle runs after the current one completes.
   */
  const drainQueue = useCallback(async () => {
    if (processingRef.current) {
      scheduledRef.current = true;
      return;
    }

    processingRef.current = true;
    scheduledRef.current = false;

    try {
      // Loop until the queue has no pending entries left
      let store = useVisceraStore.getState();
      while (store.syncQueue.some((e) => e.status === 'pending')) {
        const entry = store.syncQueue.find((e) => e.status === 'pending');
        if (!entry) break;

        const dispatcher = dispatchers[entry.action];
        if (!dispatcher) {
          // Unsupported action (e.g. move) — skip, will be handled later
          useVisceraStore.getState().updateSyncEntry(entry.mutationId, {
            status: 'failed',
          });
          store = useVisceraStore.getState();
          continue;
        }

        const success = await attemptWithRetry(entry, dispatcher, (err) => {
          useVisceraStore.getState().updateSyncEntry(entry.mutationId, {
            error: extractErrorMessage(err),
          });
        });

        if (success) {
          useVisceraStore.getState().removeFromQueue(entry.mutationId);
          useVisceraStore.getState().clearTransient(entry.nodeId);
        } else {
          useVisceraStore.getState().updateSyncEntry(entry.mutationId, {
            status: 'failed',
          });
          toast.error(ERROR_TOAST_MESSAGE);
        }

        store = useVisceraStore.getState();
      }
    } finally {
      processingRef.current = false;

      // If a re-entrant call was scheduled, start another cycle
      if (scheduledRef.current) {
        scheduledRef.current = false;
        drainQueue();
      }
    }
  }, []);

  // ── Subscribe to syncQueue changes ───────────────────────────────────────
  useEffect(() => {
    const unsub = useVisceraStore.subscribe(
      (state) => state.syncQueue,
      (queue) => {
        const hasPending = queue.some((e) => e.status === 'pending');
        if (hasPending) {
          drainQueue();
        }
      },
      { fireImmediately: false },
    );

    return unsub;
  }, [drainQueue]);
}
