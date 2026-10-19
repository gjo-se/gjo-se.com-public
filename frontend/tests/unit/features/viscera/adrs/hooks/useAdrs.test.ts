/**
 * Tests: useAdrs
 *
 * Verifies the derived catalogue API (ids, lookup, decisions-by-system,
 * diagram-name resolution) and the loading lifecycle when ADR files are
 * unreachable. Files that fail to load are omitted rather than surfacing an
 * error, so the catalogue settles at an empty list.
 */

import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useAdrs } from '@src/features/viscera/adrs/hooks/useAdrs';

import type { Adr } from '@src/features/viscera/services/adrFileService';
import { makeDiagram, makeWorkspace, makeWorkspaceWrapper } from '../../helpers';

function makeAdr(patch: Partial<Adr> = {}): Adr {
  return {
    id: 1,
    title: 'ADR One',
    status: 'accepted',
    date: '2026-01-01',
    systems: [],
    diagrams: [],
    tags: [],
    idString: '0001',
    content: '',
    filePath: '/architecture/adr/0001-one.md',
    ...patch,
  };
}

describe('useAdrs', () => {
  it('settles on an empty catalogue when no ADR file is reachable', async () => {
    const wrapper = makeWorkspaceWrapper(makeWorkspace());
    const { result } = renderHook(() => useAdrs(), { wrapper });

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.adrs).toEqual([]);
    expect(result.current.allIds).toEqual([]);
    expect(result.current.error).toBeNull();
    expect(result.current.getById('0001')).toBeUndefined();
    expect(result.current.decisionsBySystem.size).toBe(0);
    expect(result.current.getDecisionsForSystem('BACKEND')).toEqual([]);
  });

  it('resolves an ADR diagram key to its workspace diagram name', async () => {
    const wrapper = makeWorkspaceWrapper(
      makeWorkspace({ diagrams: [makeDiagram({ key: 'backend-container', name: 'Backend' })] }),
    );
    const { result } = renderHook(() => useAdrs(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    const adr = makeAdr({ diagrams: ['backend-container', 'unknown-key'] });

    expect(result.current.getAdrDiagrams(adr)).toEqual([
      { key: 'backend-container', name: 'Backend' },
      { key: 'unknown-key', name: 'unknown-key' },
    ]);
  });

  it('falls back to the diagram key when the workspace has no room for it', async () => {
    const wrapper = makeWorkspaceWrapper(makeWorkspace());
    const { result } = renderHook(() => useAdrs(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.getAdrDiagrams(makeAdr({ diagrams: ['only-key'] }))).toEqual([
      { key: 'only-key', name: 'only-key' },
    ]);
  });
});
