/**
 * AdrSplitEditor – CodeMirror + Markdown-Preview split-screen for ADR editing.
 *
 * Encapsulates CodeMirror initialization, theme switching via MutationObserver,
 * split-ratio resize via drag, and content-synchronisation from rawText.
 *
 * Follows viewer pattern G5: component encapsulates its own complexity,
 * receives only rawText + previewContent as props.
 */
import { markdown as markdownLang } from '@codemirror/lang-markdown';
import { EditorState } from '@codemirror/state';
import { oneDark } from '@codemirror/theme-one-dark';
import {
  EditorView,
  keymap,
  lineNumbers,
  highlightActiveLine,
  highlightSpecialChars,
  drawSelection,
  rectangularSelection,
} from '@codemirror/view';
import { cva } from 'class-variance-authority';
import { useEffect, useRef } from 'react';

import Markdown from '@src/components/primitives/Markdown/Markdown';
import Text from '@src/components/primitives/Text/Text';

import { useCodeMirrorTheme } from '../../../editor/hooks/useCodeMirrorTheme';
import { useCodeMirrorView } from '../../../editor/hooks/useCodeMirrorView';
import { useSplitResize } from '../../hooks/useSplitResize';

// ── CSS Constants ──────────────────────────────────────────────────────────

const resizeHandleClass = 'flex w-1 shrink-0 cursor-col-resize items-center justify-center bg-border hover:bg-primary/50';
const resizeGripClass = 'h-10 w-0.5 rounded-full bg-muted-foreground/30';
const paneHeaderClass = 'border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 py-1.5';
const editorContainerClass = '[&_.cm-editor]:min-h-[500px] [&_.cm-editor]:h-[calc(100vh-380px)] [&_.cm-editor]:outline-none';
const previewContainerClass = 'h-[calc(100vh-380px)] min-h-[500px] overflow-y-auto p-6';
const splitContainerClass = 'flex w-full gap-0 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden';
const paneVariants = cva('min-w-0');

// ── Props ──────────────────────────────────────────────────────────────────

interface AdrSplitEditorProps {
  rawText: string;
  previewContent: string;
}

// ── Component ──────────────────────────────────────────────────────────────

/**
 * AdrSplitEditor – split-screen editor with CodeMirror (left) and Markdown preview (right).
 */
export default function AdrSplitEditor({ rawText, previewContent }: AdrSplitEditorProps) {
  const { containerRef, handleResizeStart, editorWidth, previewWidth } = useSplitResize('adr');

  // ── CodeMirror ─────────────────────────────────────────────────────────
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const themeCompartment = useCodeMirrorTheme(viewRef);

  useCodeMirrorView(editorRef, viewRef, () => {
    const isDark = document.documentElement.classList.contains('dark');
    return [
      lineNumbers(),
      highlightActiveLine(),
      highlightSpecialChars(),
      drawSelection(),
      rectangularSelection(),
      EditorState.tabSize.of(2),
      keymap.of([]),
      markdownLang(),
      themeCompartment.of(isDark ? oneDark : []),
    ];
  });

  // Update editor content when rawText changes (file switch)
  useEffect(() => {
    if (!viewRef.current) return;
    const currentContent = viewRef.current.state.doc.toString();
    if (currentContent !== rawText && rawText) {
      viewRef.current.dispatch({
        changes: {
          from: 0,
          to: currentContent.length,
          insert: rawText,
        },
      });
    }
  }, [rawText]);

  return (
    <div ref={containerRef} className={splitContainerClass}>
      {/* Editor pane */}
      <div style={{ width: editorWidth }} className={paneVariants()}>
        <div className={paneHeaderClass}>
          <Text as="span" size="xs" weight="medium" uppercase color="muted">
            Markdown
          </Text>
        </div>
        <div ref={editorRef} className={editorContainerClass} />
      </div>

      {/* Resize handle */}
      <div
        onMouseDown={handleResizeStart}
        className={resizeHandleClass}
        role="separator"
        aria-orientation="vertical"
        aria-label="Editor- und Preview-Größe anpassen"
      >
        <div className={resizeGripClass} />
      </div>

      {/* Preview pane */}
      <div style={{ width: previewWidth }} className={paneVariants()}>
        <div className={paneHeaderClass}>
          <Text as="span" size="xs" weight="medium" uppercase color="muted">
            Preview
          </Text>
        </div>
        <div className={previewContainerClass}>
          <Markdown>{previewContent}</Markdown>
        </div>
      </div>
    </div>
  );
}
