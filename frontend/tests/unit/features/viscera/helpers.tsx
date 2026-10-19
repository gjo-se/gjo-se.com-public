/**
 * Shared test helpers for the viscera unit suite.
 *
 * Provides workspace fixtures, a WorkspaceContext wrapper and a deterministic
 * store reset. Test files only — no production behaviour lives here.
 */

import { createVisceraCommandHistory } from '@src/features/viscera/store/visceraCommandHistory';
import { useVisceraStore } from '@src/features/viscera/store/visceraStore';
import { WorkspaceContext } from '@src/features/viscera/core/useWorkspace';

import type { ReactNode } from 'react';
import type {
  ArchitectureObject,
  Diagram,
  Workspace,
} from '@src/features/viscera/core/workspaceSchema';

const DEFAULT_WORKSPACE: Workspace = {
  id: 'ws-test',
  name: 'Test Workspace',
  description: '',
  people: [],
  objects: [],
  diagrams: [],
  groups: [],
  edges: [],
  flows: [],
  styles: [],
};

/** Builds a workspace fixture with optional overrides. */
export function makeWorkspace(patch: Partial<Workspace> = {}): Workspace {
  return { ...DEFAULT_WORKSPACE, ...patch };
}

/** Builds a flat architecture object fixture with optional overrides. */
export function makeObject(patch: Partial<ArchitectureObject> = {}): ArchitectureObject {
  return { id: 'object', name: 'Object', description: '', ...patch } as ArchitectureObject;
}

/** Builds a diagram fixture with optional overrides. */
export function makeDiagram(patch: Partial<Diagram> = {}): Diagram {
  return {
    key: 'diagram-test',
    name: 'Test Diagram',
    type: 'container',
    description: '',
    parent: null,
    source: 'code',
    base: null,
    layout: 'lr',
    nodes: {},
    status: 'viscera-approved',
    scan_meta: null,
    ...patch,
  };
}

/**
 * Builds a WorkspaceContext wrapper component.
 *
 * @param workspace Workspace exposed to the hook under test.
 * @param onUpdate Optional sink receiving every `updateWorkspace` call.
 */
export function makeWorkspaceWrapper(
  workspace: Workspace | null,
  onUpdate?: (workspace: Workspace) => void,
) {
  return function WorkspaceWrapper({ children }: { children: ReactNode }) {
    return (
      <WorkspaceContext.Provider
        value={{
          workspace,
          error: null,
          loading: false,
          reload: () => undefined,
          updateWorkspace: onUpdate ?? (() => undefined),
          resetToServer: () => undefined,
        }}
      >
        {children}
      </WorkspaceContext.Provider>
    );
  };
}

/** Resets the singleton viscera store (and its command history) to defaults. */
export function resetVisceraStore(): void {
  useVisceraStore.setState({
    viewport: { x: 0, y: 0, zoom: 1 },
    overrides: {},
    nodeOverrides: {},
    basePositions: [],
    layoutVersion: 0,
    interaction: { hoveredNodeId: null, pulsedNodeIds: [] },
    fitViewRequested: false,
    layoutResetKey: 0,
    suppressAutoPersist: false,
    canUndo: false,
    canRedo: false,
    selectedNodes: [],
    selectedEdges: [],
    pendingOptimisticNodes: {},
    tempEdges: {},
    contextMenuPosition: null,
    pendingCanvasAdd: null,
    nodes: [],
    edges: [],
    syncQueue: [],
    source: 'code',
    viewKey: 'SystemContext',
    detailContainerId: null,
    objectId: null,
    objectTab: 'details',
    derivedDiagram: null,
    lastUrl: {},
    badgeStates: new Map(),
    hoveredKey: null,
    activeFilterCount: 0,
    activeFlowId: null,
    activeStepIndex: 0,
    isPlaying: false,
    modules: [],
    system: null,
    topLevel: null,
    modulesLoading: false,
    modulesError: null,
    focusModuleId: null,
    focusMode: null,
    collapsedIds: [],
    splitRatioAdr: 0.5,
    splitRatioYaml: 0.5,
    isFullscreen: false,
    shortcutsOpen: false,
    panelCollapsed: false,
    viewMode: 'reactflow',
  });
  createVisceraCommandHistory(useVisceraStore.getState());
}
