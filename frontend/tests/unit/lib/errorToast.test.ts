/**
 * Tests: showErrorToast – persistent error toast options.
 *
 * Uses sonner's public history API instead of mocking the library, so the test
 * asserts the produced toast (type, text, persistence flags) rather than calls.
 */
import { toast } from 'sonner';
import { beforeEach, describe, expect, it } from 'vitest';

import { showErrorToast } from '@src/lib/errorToast';

import type { ToastT, ToastToDismiss } from 'sonner';

/**
 * Narrows a history entry to a real (non-dismissal) toast.
 *
 * @param entry - History entry.
 * @returns True for a toast entry.
 */
function isToast(entry: ToastT | ToastToDismiss): entry is ToastT {
  return 'title' in entry;
}

/**
 * Returns all visible toast titles in history order.
 *
 * @returns Current toast titles.
 */
function toastTitles(): unknown[] {
  return toast.getHistory().filter(isToast).map((entry) => entry.title);
}

beforeEach(() => {
  toast.dismiss();
});

describe('showErrorToast', () => {
  it('erzeugt einen Fehler-Toast mit der übergebenen Nachricht', () => {
    showErrorToast('Speichern fehlgeschlagen');

    expect(toast.getHistory().filter(isToast).at(-1)).toMatchObject({
      type: 'error',
      title: 'Speichern fehlgeschlagen',
    });
  });

  it('lässt den Toast dauerhaft sichtbar und schließbar', () => {
    showErrorToast('Netzwerkfehler');

    expect(toast.getHistory().filter(isToast).at(-1)).toMatchObject({
      duration: Infinity,
      closeButton: true,
      dismissible: true,
    });
  });

  it('übernimmt verschiedene Meldungen unverändert', () => {
    showErrorToast('Laden fehlgeschlagen');
    showErrorToast('Bitte erneut versuchen');

    expect(toastTitles()).toContain('Laden fehlgeschlagen');
    expect(toastTitles()).toContain('Bitte erneut versuchen');
  });
});
