/**
 * Tests: proofStore – application-proof context persisted for the session.
 *
 * The observable contract is the store state plus the sessionStorage snapshot
 * (the context must end with the browser session).
 */
import { beforeEach, describe, expect, it } from 'vitest';

import { useProofStore } from '@src/lib/proofStore';

const STORAGE_KEY = 'skills-proof-context';

beforeEach(() => {
  sessionStorage.clear();
  useProofStore.setState({ projectId: null });
});

describe('useProofStore', () => {
  it('setzt die Projekt-ID im Store', () => {
    useProofStore.getState().setProjectId(42);

    expect(useProofStore.getState().projectId).toBe(42);
  });

  it('persistiert die Projekt-ID im sessionStorage', () => {
    useProofStore.getState().setProjectId(7);

    const stored = JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? 'null');

    expect(stored).toMatchObject({ state: { projectId: 7 } });
  });

  it('löscht den Kontext mit clearProof', () => {
    useProofStore.getState().setProjectId(99);

    useProofStore.getState().clearProof();

    expect(useProofStore.getState().projectId).toBeNull();
  });

  it('erlaubt das explizite Zurücksetzen auf null', () => {
    useProofStore.getState().setProjectId(5);
    useProofStore.getState().setProjectId(null);

    expect(useProofStore.getState().projectId).toBeNull();
  });
});
