/**
 * Tests: useExistingNodeCandidates
 *
 * Verifies the candidate derivation for a diagram: scoped workspace objects are
 * offered with their display name, nodes already present in the diagram's node
 * map are excluded, and persons resolve their own name.
 */

import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useExistingNodeCandidates } from '@src/features/viscera/viewer/hooks/useExistingNodeCandidates';

import {
  makeDiagram,
  makeObject,
  makeWorkspace,
  makeWorkspaceWrapper,
} from '../../helpers';

const workspace = makeWorkspace({
  objects: [
    makeObject({ id: 'backend', name: 'Backend', type: 'system' }),
    makeObject({ id: 'api', name: 'API', type: 'container', parent: 'backend' }),
    makeObject({ id: 'db', name: 'Database', type: 'container', parent: 'backend' }),
  ],
  people: [makeObject({ id: 'greg', name: 'Greg', type: 'person' })],
  edges: [{ from: 'api', to: 'greg' }],
});

describe('useExistingNodeCandidates', () => {
  it('returns no candidates without a diagram', () => {
    const wrapper = makeWorkspaceWrapper(workspace);
    const { result } = renderHook(() => useExistingNodeCandidates(null), { wrapper });

    expect(result.current).toEqual([]);
  });

  it('returns no candidates without a workspace', () => {
    const wrapper = makeWorkspaceWrapper(null);
    const { result } = renderHook(
      () => useExistingNodeCandidates(makeDiagram({ parent: 'backend' })),
      { wrapper },
    );

    expect(result.current).toEqual([]);
  });

  it('offers scoped nodes with their resolved names', () => {
    const wrapper = makeWorkspaceWrapper(workspace);
    const diagram = makeDiagram({ parent: 'backend' });

    const { result } = renderHook(() => useExistingNodeCandidates(diagram), { wrapper });

    expect(result.current).toEqual([
      { id: 'api', name: 'API' },
      { id: 'db', name: 'Database' },
      { id: 'greg', name: 'Greg' },
    ]);
  });

  it('excludes nodes already assigned to the diagram', () => {
    const wrapper = makeWorkspaceWrapper(workspace);
    const diagram = makeDiagram({
      parent: 'backend',
      nodes: { api: { x: 0, y: 0 } },
    });

    const { result } = renderHook(() => useExistingNodeCandidates(diagram), { wrapper });

    expect(result.current.map((candidate) => candidate.id)).toEqual(['db', 'greg']);
  });
});
