/**
 * Tests: extractApiError
 *
 * Prüft: Array-detail (Validierung), String-detail, unbekannte Errors.
 */
import { describe, expect, it } from 'vitest';

import { extractApiError } from '@src/lib/api/extractError';

describe('extractApiError', () => {
  it('extrahiert Detail aus Array-Response', () => {
    const error = {
      response: {
        data: {
          detail: [
            { msg: 'Name ist Pflicht' },
            { msg: 'Ungültige URL' },
          ],
        },
      },
    };

    expect(extractApiError(error)).toBe('Name ist Pflicht; Ungültige URL');
  });

  it('filtriert leere msg-Einträge im Array', () => {
    const error = {
      response: {
        data: {
          detail: [
            { msg: 'Fehler 1' },
            { msg: '' },
            { msg: 'Fehler 2' },
          ],
        },
      },
    };

    expect(extractApiError(error)).toBe('Fehler 1; Fehler 2');
  });

  it('extrahiert Detail aus String-Response', () => {
    const error = {
      response: {
        data: {
          detail: 'Resource nicht gefunden',
        },
      },
    };

    expect(extractApiError(error)).toBe('Resource nicht gefunden');
  });

  it('gibt Fallback bei unbekanntem Error', () => {
    expect(extractApiError(new Error('Netzwerk'))).toBe('Netzwerk');
  });

  it('gibt Default-Fallback bei leerem Error', () => {
    expect(extractApiError(null)).toBe('Fehler beim Speichern');
  });

  it('gibt Default-Fallback bei komplett unbekanntem Wert', () => {
    expect(extractApiError(42)).toBe('Fehler beim Speichern');
  });

  it('extrahiert message-Feld wenn kein detail vorhanden', () => {
    const error = { message: 'Timeout' };
    expect(extractApiError(error)).toBe('Timeout');
  });

  it('bevorzugt detail über message', () => {
    const error = {
      response: { data: { detail: 'Spezifischer Fehler' } },
      message: 'Allgemeiner Fehler',
    };
    expect(extractApiError(error)).toBe('Spezifischer Fehler');
  });
});
