/**
 * Tests: withAsyncState – loading/error lifecycle around an async operation.
 *
 * State is observed through setters backed by plain variables: the callback must
 * run with loading=true and error=null, and the settled state must be clean.
 */
import { describe, expect, it } from 'vitest';

import { withAsyncState } from '@src/lib/withAsyncState';

/**
 * Creates setters that write into a shared observation object.
 *
 * @returns The current state plus both setters.
 */
function createStateProbe() {
  const state: { loading: boolean; error: string | null } = { loading: false, error: 'stale' };
  return {
    state,
    setLoading: (value: boolean) => {
      state.loading = value;
    },
    setError: (value: string | null) => {
      state.error = value;
    },
  };
}

describe('withAsyncState', () => {
  it('liefert das Ergebnis und räumt Loading sowie Error auf', async () => {
    const probe = createStateProbe();

    const result = await withAsyncState(probe.setLoading, probe.setError, async () => 'fertig');

    expect(result).toBe('fertig');
    expect(probe.state.loading).toBe(false);
    expect(probe.state.error).toBeNull();
  });

  it('setzt während der Operation Loading und löscht einen alten Fehler', async () => {
    const probe = createStateProbe();
    let stateDuringCall = { loading: false, error: null as string | null };

    await withAsyncState(probe.setLoading, probe.setError, async () => {
      stateDuringCall = { ...probe.state };
      return 1;
    });

    expect(stateDuringCall).toEqual({ loading: true, error: null });
  });

  it('setzt die Standard-Fehlermeldung und liefert undefined bei Fehler', async () => {
    const probe = createStateProbe();

    const result = await withAsyncState(probe.setLoading, probe.setError, async () => {
      throw new Error('kaputt');
    });

    expect(result).toBeUndefined();
    expect(probe.state.error).toBe('Fehler beim Laden der Daten.');
    expect(probe.state.loading).toBe(false);
  });

  it('verwendet eine eigene Fehlermeldung wenn übergeben', async () => {
    const probe = createStateProbe();

    const result = await withAsyncState(
      probe.setLoading,
      probe.setError,
      async () => {
        throw new Error('kaputt');
      },
      'Projekte laden fehlgeschlagen',
    );

    expect(result).toBeUndefined();
    expect(probe.state.error).toBe('Projekte laden fehlgeschlagen');
  });
});
