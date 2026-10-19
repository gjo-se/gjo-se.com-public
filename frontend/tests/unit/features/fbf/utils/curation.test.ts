/**
 * Tests: confirmRows + requireGhostName
 *
 * confirmRows selects only not-yet-active rows, short-circuits without a
 * network call and reports failures via the error toast. requireGhostName
 * trims the input and rejects empty input.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const toast = vi.hoisted(() => ({ error: vi.fn() }));

vi.mock('sonner', () => ({ toast: { error: toast.error } }));

import { confirmRows, requireGhostName } from '@src/features/fbf/utils/curation';

beforeEach(() => {
  toast.error.mockReset();
});

describe('confirmRows', () => {
  const rows = [
    { id: 1, active: false },
    { id: 2, active: true },
    { id: 3, active: false },
  ];

  it('bestätigt nur die noch nicht aktiven Zeilen', async () => {
    const confirm = vi.fn().mockResolvedValue(undefined);

    const result = await confirmRows(rows, confirm, 'Fehler');

    expect(confirm.mock.calls[0]).toEqual([[1, 3]]);
    expect(result).toBe(true);
  });

  it('ruft die API nicht auf und meldet false, wenn alle Zeilen aktiv sind', async () => {
    const confirm = vi.fn().mockResolvedValue(undefined);

    const result = await confirmRows([{ id: 2, active: true }], confirm, 'Fehler');

    expect(confirm).not.toHaveBeenCalled();
    expect(result).toBe(false);
  });

  it('meldet false, wenn keine Zeilen ausgewählt sind', async () => {
    const confirm = vi.fn().mockResolvedValue(undefined);

    const result = await confirmRows([], confirm, 'Fehler');

    expect(confirm).not.toHaveBeenCalled();
    expect(result).toBe(false);
  });

  it('zeigt den Fehler-Toast und meldet false, wenn die Bestätigung fehlschlägt', async () => {
    const confirm = vi.fn().mockRejectedValue(new Error('500'));

    const result = await confirmRows(rows, confirm, 'Bestätigen fehlgeschlagen.');

    expect(toast.error).toHaveBeenCalledWith('Bestätigen fehlgeschlagen.', {
      duration: Infinity,
      closeButton: true,
      dismissible: true,
    });
    expect(result).toBe(false);
  });
});

describe('requireGhostName', () => {
  it('liefert den getrimmten Namen', () => {
    expect(requireGhostName({ name: '  Frontend  ' })).toBe('Frontend');
  });

  it('wirft bei leerem oder fehlendem Namen', () => {
    expect(() => requireGhostName({ name: '   ' })).toThrow('Name ist erforderlich.');
    expect(() => requireGhostName({})).toThrow('Name ist erforderlich.');
    expect(() => requireGhostName({ name: null })).toThrow('Name ist erforderlich.');
  });

  it('konvertiert Nicht-String-Werte in einen String', () => {
    expect(requireGhostName({ name: 42 })).toBe('42');
  });
});
