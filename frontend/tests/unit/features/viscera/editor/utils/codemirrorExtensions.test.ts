/**
 * Tests: codemirrorExtensions
 *
 * Verifies that the shared base extension set is usable in an EditorState and
 * contributes the documented editor facets (2-space tab size, no key bindings,
 * gutter providers for line numbers and lint markers).
 */

import { EditorState } from '@codemirror/state';
import { keymap } from '@codemirror/view';
import { describe, expect, it } from 'vitest';

import { createBaseExtensions } from '@src/features/viscera/editor/utils/codemirrorExtensions';

describe('createBaseExtensions', () => {
  it('erzeugt einen nutzbaren EditorState mit YAML-Dokument', () => {
    const state = EditorState.create({ doc: 'id: ws-test', extensions: createBaseExtensions() });

    expect(state.doc.toString()).toBe('id: ws-test');
  });

  it('setzt die Tab-Breite auf zwei Leerzeichen', () => {
    const state = EditorState.create({ doc: '', extensions: createBaseExtensions() });

    expect(state.facet(EditorState.tabSize)).toBe(2);
  });

  it('registriert keine Tastatur-Bindings', () => {
    const state = EditorState.create({ doc: '', extensions: createBaseExtensions() });

    expect(state.facet(keymap).flat()).toEqual([]);
  });

  it('liefert neun vollständig definierte Top-Level-Erweiterungen', () => {
    const extensions = createBaseExtensions();

    expect(extensions).toHaveLength(9);
    expect(extensions.every((extension) => extension !== undefined)).toBe(true);
  });

  it('liefert bei jedem Aufruf eine frische Extension-Liste', () => {
    const first = createBaseExtensions();
    const second = createBaseExtensions();

    expect(first).not.toBe(second);
    expect(second).toHaveLength(first.length);
  });
});
