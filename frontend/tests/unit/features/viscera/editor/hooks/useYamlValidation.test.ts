/**
 * Tests: useYamlValidation
 *
 * Exercises the returned linter extension against a real CodeMirror view:
 * valid YAML produces no diagnostics, a YAML syntax error produces a parse
 * diagnostic, and the node-file path switches to the single-object schema
 * (a document that is valid for `objectSchema` but not for `workspaceSchema`).
 */

import { forEachDiagnostic, forceLinting } from '@codemirror/lint';
import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useYamlValidation } from '@src/features/viscera/editor/hooks/useYamlValidation';

import type { Extension } from '@codemirror/state';

function mountView(extensions: Extension[], doc: string): EditorView {
  const parent = document.createElement('div');
  document.body.appendChild(parent);
  return new EditorView({ state: EditorState.create({ doc, extensions }), parent });
}

function collectMessages(view: EditorView): string[] {
  const messages: string[] = [];
  forEachDiagnostic(view.state, (diagnostic) => {
    messages.push(diagnostic.message);
  });
  return messages;
}

const VALID_WORKSPACE = ['id: ws-test', 'name: Test', "description: ''"].join('\n');
const OBJECT_ONLY = ['id: backend', 'name: Backend'].join('\n');

describe('useYamlValidation', () => {
  it('returns no diagnostics for a valid workspace document', async () => {
    const { result } = renderHook(() => useYamlValidation());
    const view = mountView([result.current.lintExtension], VALID_WORKSPACE);

    forceLinting(view);
    await waitFor(() => expect(collectMessages(view)).toEqual([]));

    view.destroy();
  });

  it('reports a parse error for malformed yaml', async () => {
    const { result } = renderHook(() => useYamlValidation());
    const view = mountView([result.current.lintExtension], 'id: [unclosed');

    forceLinting(view);

    await waitFor(() =>
      expect(collectMessages(view).some((message) => message.startsWith('YAML Parse:'))).toBe(true),
    );
    view.destroy();
  });

  it('validates node files against the object schema', async () => {
    const { result: workspaceResult } = renderHook(() => useYamlValidation());
    const workspaceView = mountView([workspaceResult.current.lintExtension], OBJECT_ONLY);
    forceLinting(workspaceView);
    await waitFor(() => expect(collectMessages(workspaceView).length).toBeGreaterThan(0));

    const { result: nodeResult } = renderHook(() => useYamlValidation('/architecture/nodes/backend.yml'));
    const nodeView = mountView([nodeResult.current.lintExtension], OBJECT_ONLY);
    forceLinting(nodeView);
    await waitFor(() => expect(collectMessages(nodeView)).toEqual([]));

    workspaceView.destroy();
    nodeView.destroy();
  });

  it('returns no diagnostics for an empty document', () => {
    const { result } = renderHook(() => useYamlValidation());
    const view = mountView([result.current.lintExtension], '   ');

    forceLinting(view);

    expect(collectMessages(view)).toEqual([]);
    view.destroy();
  });
});
