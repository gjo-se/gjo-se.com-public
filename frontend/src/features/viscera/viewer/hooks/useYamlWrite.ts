import { useCallback, useEffect, useRef } from 'react';
import { z } from 'zod';

import { useWorkspace } from '../../core/useWorkspace';
import { modelObjectTypeSchema } from '../../core/workspaceSchema';
import { useVisceraStore } from '../../store/visceraStore';

import {
  useBulkValidation,
  applyFieldEdit,
} from './useBulkValidation';

import type { Workspace } from '../../core/workspaceSchema';

// ── Types ────────────────────────────────────────────────────────────────────

export interface WriteResult {
  success: boolean;
  error?: string;
}

// ── Constants ────────────────────────────────────────────────────────────────

const DEFAULT_DEBOUNCE_MS = 500;

/** Per-field Zod validators for client-side validation before API call. */
const FIELD_VALIDATORS: Record<string, z.ZodSchema> = {
  name: z.string().min(1, 'Name must not be empty'),
  description: z.string(),
  type: modelObjectTypeSchema,
  status: z.string().optional(),
  external: z.boolean(),
  tags: z.array(z.string()),
  technology: z.string().min(1, 'Technology must not be empty'),
  contains: z.array(z.string()),
};

// ── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Hook for writing individual field updates to architecture YAML files.
 *
 * - Debounced: 500ms delay, last value wins
 * - Client-side Zod validation before API call
 * - Bulk validation via ``useBulkValidation`` before every PUT
 * - Calls ``PUT /api/v1/architecture/nodes/{objectId}``
 */
export function useYamlWrite() {
  const store = useVisceraStore();
  const { workspace, updateWorkspace } = useWorkspace();
  const workspaceRef = useRef(workspace);

  useEffect(() => {
    workspaceRef.current = workspace;
  }, [workspace]);

  const { validate } = useBulkValidation();

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const writeField = useCallback(
    (objectId: string, field: string, value: unknown): Promise<WriteResult> => {
      return new Promise((resolve) => {
        // Debounce: clear previous timer, set new one
        if (timerRef.current !== null) {
          clearTimeout(timerRef.current);
        }

        timerRef.current = setTimeout(() => {
          timerRef.current = null;

          // 1. Per-field Zod validation
          const fieldValidator = FIELD_VALIDATORS[field];
          if (fieldValidator) {
            const parsed = fieldValidator.safeParse(value);
            if (!parsed.success) {
              const message =
                parsed.error.issues[0]?.message ?? 'Invalid value';
              resolve({ success: false, error: message });
              return;
            }
          }

          // 2. Bulk validation – validate entire workspace with optimistically applied edit
          let candidate: Workspace | null = null;
          const currentWs = workspaceRef.current;
          if (currentWs) {
            candidate = applyFieldEdit(currentWs, objectId, field, value);
            const { valid, errors } = validate(candidate);
            if (!valid) {
              const message =
                errors.length === 1
                  ? errors[0].message
                  : errors.map((e) => e.message).join('; ');
              resolve({ success: false, error: message });
              return;
            }
          }

          // 3. Optimistic workspace update – Sidebar + Canvas lesen aus dem
          // Workspace-Context (Card-Kind = Projektion aus object.type, R6).
          // VisceraReactFlow baut Node-Modelle bei workspace-Änderung neu.
          if (candidate) updateWorkspace(candidate);

          // 4. Store update (optimistic + sync queue — API call is fire-and-forget via useSyncService)
          store.updateNodeField(objectId, field, value);
          resolve({ success: true });
        }, DEFAULT_DEBOUNCE_MS);
      });
    },
    [validate, store, updateWorkspace],
  );

  return { writeField };
}
