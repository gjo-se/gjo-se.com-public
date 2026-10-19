/**
 * codemirrorExtensions – Basiserweiterungen für CodeMirror-EditorViews.
 *
 * Getrennt von den YAML-Fehler-/Merge-Helfern (`yamlUtils`): reine
 * CodeMirror-Konfiguration.
 */

import { yaml as yamlLang } from '@codemirror/lang-yaml';
import { lintGutter } from '@codemirror/lint';
import { EditorState, type Extension } from '@codemirror/state';
import {
  keymap,
  lineNumbers,
  highlightActiveLine,
  highlightSpecialChars,
  drawSelection,
  rectangularSelection,
} from '@codemirror/view';

/**
 * Base CodeMirror extensions shared across EditorView instances.
 */
export function createBaseExtensions(): Extension[] {
  return [
    lineNumbers(),
    highlightActiveLine(),
    highlightSpecialChars(),
    drawSelection(),
    rectangularSelection(),
    EditorState.tabSize.of(2),
    keymap.of([]),
    yamlLang(),
    lintGutter(),
  ];
}
