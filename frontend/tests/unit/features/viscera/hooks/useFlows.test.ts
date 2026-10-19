/**
 * Tests: useFlows
 *
 * Verifies the flow catalogue from the workspace, selection through the store,
 * and the parent/sub-flow relations derived from `flowParentIds`.
 */

import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import { useFlows } from '@src/features/viscera/hooks/useFlows';
import { useVisceraStore } from '@src/features/viscera/store/visceraStore';

import { makeWorkspace, makeWorkspaceWrapper, resetVisceraStore } from '../helpers';

import type { Flow } from '@src/features/viscera/core/workspaceSchema';

function makeFlow(id: string, parentIds: string[] = []): Flow {
  return {
    id,
    title: `Flow ${id}`,
    steps: [],
    tags: [],
    flowParentIds: parentIds,
  };
}

const FLOWS = [makeFlow('root'), makeFlow('child', ['root']), makeFlow('grandchild', ['child'])];
const wrapper = makeWorkspaceWrapper(makeWorkspace({ flows: FLOWS }));

beforeEach(() => {
  resetVisceraStore();
});

describe('useFlows', () => {
  it('exposes all workspace flows without an active flow', () => {
    const { result } = renderHook(() => useFlows(), { wrapper });

    expect(result.current.flows.map((flow) => flow.id)).toEqual(['root', 'child', 'grandchild']);
    expect(result.current.activeFlow).toBeNull();
  });

  it('exposes the active flow after selection', () => {
    const { result } = renderHook(() => useFlows(), { wrapper });

    act(() => result.current.selectFlow('child'));

    expect(result.current.activeFlow?.id).toBe('child');
    expect(useVisceraStore.getState().activeFlowId).toBe('child');
  });

  it('clears the active flow on null selection', () => {
    const { result } = renderHook(() => useFlows(), { wrapper });
    act(() => result.current.selectFlow('root'));

    act(() => result.current.selectFlow(null));

    expect(result.current.activeFlow).toBeNull();
  });

  it('resolves flows that reference a flow id as their parent', () => {
    const { result } = renderHook(() => useFlows(), { wrapper });

    expect(result.current.getParentFlows('root').map((flow) => flow.id)).toEqual(['child']);
    expect(result.current.getParentFlows('child').map((flow) => flow.id)).toEqual(['grandchild']);
    expect(result.current.getParentFlows('grandchild')).toEqual([]);
  });

  it('resolves the parent flows referenced by a flow', () => {
    const { result } = renderHook(() => useFlows(), { wrapper });

    expect(result.current.getSubFlows('child').map((flow) => flow.id)).toEqual(['root']);
    expect(result.current.getSubFlows('root')).toEqual([]);
    expect(result.current.getSubFlows('unknown')).toEqual([]);
  });

  it('navigates to a flow by selecting it', () => {
    const { result } = renderHook(() => useFlows(), { wrapper });

    act(() => result.current.navigateToFlow('grandchild'));

    expect(result.current.activeFlow?.id).toBe('grandchild');
  });
});
