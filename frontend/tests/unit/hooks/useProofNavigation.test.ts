/**
 * Tests: useProofNavigation – proof-context project id plus the locale-aware
 * skills path.
 *
 * The zustand store is the real implementation; only the router is provided
 * through a MemoryRouter.
 */
import { createElement } from 'react';
import { act, renderHook } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it } from 'vitest';

import { useProofStore } from '@src/lib/proofStore';
import { useProofNavigation } from '@src/hooks/useProofNavigation';

import type { ReactNode } from 'react';

function renderAt(path: string) {
  const wrapper = ({ children }: { children: ReactNode }) =>
    createElement(MemoryRouter, { initialEntries: [path] }, children);

  return renderHook(() => useProofNavigation(), { wrapper });
}

describe('useProofNavigation', () => {
  beforeEach(() => {
    useProofStore.getState().clearProof();
    sessionStorage.clear();
  });

  it('uses the plain skills path without a proof context', () => {
    const { result } = renderAt('/skills');

    expect(result.current.projectId).toBeNull();
    expect(result.current.skillsPath).toBe('/skills');
  });

  it('uses the proof path once a project id is set', () => {
    const { result } = renderAt('/skills');

    act(() => {
      result.current.setProjectId(5);
    });

    expect(result.current.projectId).toBe(5);
    expect(result.current.skillsPath).toBe('/skills/5');
  });

  it('localizes the proof path for the EN locale', () => {
    const { result } = renderAt('/en/skills');

    act(() => {
      result.current.setProjectId(12);
    });

    expect(result.current.skillsPath).toBe('/en/skills/12');
  });

  it('falls back to the plain skills path after clearing the context', () => {
    const { result } = renderAt('/skills');

    act(() => {
      result.current.setProjectId(5);
      result.current.setProjectId(null);
    });

    expect(result.current.projectId).toBeNull();
    expect(result.current.skillsPath).toBe('/skills');
  });
});
