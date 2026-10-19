import { useCallback, useMemo } from 'react';

import { useWorkspace } from '../core/useWorkspace';
import { useVisceraStore } from '../store/visceraStore';


import type { Flow } from '../core/workspaceSchema';

export interface UseFlowsResult {
  /** All flow definitions from the workspace. */
  flows: Flow[];
  /** The currently selected flow, or null if none selected. */
  activeFlow: Flow | null;
  /** Select a flow by its ID. Pass null to deselect. */
  selectFlow: (id: string | null) => void;
  /** Find flows that reference the given flow as a parent (in their `flowParentIds`). */
  getParentFlows: (flowId: string) => Flow[];
  /** Find flows that are referenced as subflows by the given flow. */
  getSubFlows: (flowId: string) => Flow[];
  /** Select a flow and reset playback (convenience alias for `selectFlow`). */
  navigateToFlow: (id: string) => void;
}

/**
 * Hook that extracts flow definitions from the workspace YAML
 * and manages flow selection state via the Zustand store.
 *
 * Flows are grouped by view-relation implicitly: each FlowStep
 * references system/container IDs that belong to specific views.
 * Supports hierarchical flow navigation via `flowParentIds`.
 */
export function useFlows(): UseFlowsResult {
  const { workspace } = useWorkspace();
  const activeFlowId = useVisceraStore((s) => s.activeFlowId);

  const flows = useMemo(() => workspace?.flows ?? [], [workspace]);

  const activeFlow = useMemo(
    () => flows.find((f) => f.id === activeFlowId) ?? null,
    [flows, activeFlowId],
  );

  const selectFlow = useCallback((id: string | null) => {
    useVisceraStore.getState().selectFlow(id);
  }, []);

  const getParentFlows = useCallback(
    (flowId: string): Flow[] =>
      flows.filter(
        (f) => f.flowParentIds && f.flowParentIds.includes(flowId),
      ),
    [flows],
  );

  const getSubFlows = useCallback(
    (flowId: string): Flow[] => {
      const flow = flows.find((f) => f.id === flowId);
      if (!flow || !flow.flowParentIds || flow.flowParentIds.length === 0) {
        return [];
      }
      return flows.filter((f) => flow.flowParentIds!.includes(f.id));
    },
    [flows],
  );

  const navigateToFlow = useCallback(
    (id: string) => {
      useVisceraStore.getState().selectFlow(id);
    },
    [],
  );

  return {
    flows,
    activeFlow,
    selectFlow,
    getParentFlows,
    getSubFlows,
    navigateToFlow,
  };
}
