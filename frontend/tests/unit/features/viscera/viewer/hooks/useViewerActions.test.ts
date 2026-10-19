/**
 * Tests: useViewerActions
 *
 * Verifies the page coordination facade: view/object navigation, diagram world
 * switching, layout reset side effects, derived-view opening, filter state and
 * the delete-dialog lifecycle.
 */

import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import { useVisceraStore } from '@src/features/viscera/store/visceraStore';
import { useViewerActions } from '@src/features/viscera/viewer/hooks/useViewerActions';

import {
  makeDiagram,
  makeObject,
  makeWorkspace,
  makeWorkspaceWrapper,
  resetVisceraStore,
} from '../../helpers';

import type { Workspace } from '@src/features/viscera/core/workspaceSchema';

const workspace: Workspace = makeWorkspace({
  objects: [
    makeObject({ id: 'backend', name: 'Backend', type: 'system', status: 'viscera-approved' }),
    makeObject({ id: 'api', name: 'API', type: 'container', parent: 'backend', status: 'viscera-approved' }),
  ],
  diagrams: [
    makeDiagram({ key: 'backend-container', parent: 'backend' }),
    makeDiagram({ key: 'persisted-components', parent: 'backend' }),
  ],
});

const wrapper = makeWorkspaceWrapper(workspace);

beforeEach(() => {
  resetVisceraStore();
});

describe('useViewerActions', () => {
  it('exposes the default navigation and workspace state', () => {
    const { result } = renderHook(() => useViewerActions(), { wrapper });

    expect(result.current.currentViewKey).toBe('SystemContext');
    expect(result.current.objectId).toBeNull();
    expect(result.current.source).toBe('code');
    expect(result.current.isCanvasEmpty).toBe(false);
    expect(result.current.statusCounts).toEqual({});
    expect(result.current.deleteDialog.open).toBe(false);
  });

  it('opens and closes the object detail through the store', () => {
    const { result } = renderHook(() => useViewerActions(), { wrapper });

    act(() => result.current.handleObjectClick('api'));
    expect(result.current.objectId).toBe('api');
    expect(useVisceraStore.getState().objectId).toBe('api');

    act(() => result.current.handleClosePanel());
    expect(result.current.objectId).toBeNull();
  });

  it('changes the view key through the store', () => {
    const { result } = renderHook(() => useViewerActions(), { wrapper });

    act(() => result.current.handleViewKeyChange('backend-container'));

    expect(result.current.currentViewKey).toBe('backend-container');
  });

  it('switches the diagram world', () => {
    const { result } = renderHook(() => useViewerActions(), { wrapper });

    act(() => result.current.handleSourceChange('golden'));

    expect(result.current.source).toBe('golden');
    expect(useVisceraStore.getState().source).toBe('golden');
  });

  it('resets layout state and queues the empty layout persistence', () => {
    useVisceraStore.setState({
      viewKey: 'backend-container',
      nodeOverrides: { 'backend-container:api': { x: 1, y: 2 } },
      lastUrl: { 'backend-container': '/admin/viscera/views?view=backend-container' },
    });
    const { result } = renderHook(() => useViewerActions(), { wrapper });

    act(() => result.current.resetLayout());

    expect(useVisceraStore.getState().layoutResetKey).toBe(1);
    expect(useVisceraStore.getState().suppressAutoPersist).toBe(true);
    expect(useVisceraStore.getState().nodeOverrides).toEqual({});
    expect(useVisceraStore.getState().lastUrl['backend-container']).toBeUndefined();
    expect(useVisceraStore.getState().syncQueue[0]).toMatchObject({
      action: 'persist_layout',
      payload: { diagramKey: 'backend-container', nodes: {} },
    });
  });

  it('opens an ephemeral derived view for a container', () => {
    const { result } = renderHook(() => useViewerActions(), { wrapper });

    act(() => result.current.handleOpenDerivedView('backend', 'component'));

    expect(result.current.currentViewKey).toBe('backend-components');
    expect(useVisceraStore.getState().derivedDiagram?.key).toBe('backend-components');
  });

  it('does not register a derived diagram when it is persisted already', () => {
    const persistedWrapper = makeWorkspaceWrapper(
      makeWorkspace({
        objects: workspace.objects,
        diagrams: [makeDiagram({ key: 'backend-components', parent: 'backend' })],
      }),
    );
    const { result } = renderHook(() => useViewerActions(), { wrapper: persistedWrapper });

    act(() => result.current.handleOpenDerivedView('backend', 'component'));

    expect(result.current.currentViewKey).toBe('backend-components');
    expect(useVisceraStore.getState().derivedDiagram).toBeNull();
  });

  it('resets all active filter badges', () => {
    const { result } = renderHook(() => useViewerActions(), { wrapper });
    act(() => useVisceraStore.getState().toggleBadge('tag', 'kafka'));
    expect(result.current.effectiveBadgeStates.size).toBe(1);

    act(() => result.current.resetAll());

    expect(result.current.effectiveBadgeStates.size).toBe(0);
    expect(result.current.hiddenNodeIds.size).toBe(0);
  });

  it('opens the delete dialog for selected elements and cancels it', () => {
    useVisceraStore.setState({ selectedNodes: [{ id: 'api', name: 'API' }] });
    const { result } = renderHook(() => useViewerActions(), { wrapper });

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Delete' }));
    });
    expect(result.current.deleteDialog.open).toBe(true);
    expect(result.current.deleteDialog.nodes).toEqual([{ id: 'api', name: 'API' }]);

    act(() => result.current.handleDeleteCancel());
    expect(result.current.deleteDialog.open).toBe(false);
  });
});
