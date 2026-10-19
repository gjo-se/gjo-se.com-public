import { Compartment } from '@codemirror/state';
import { oneDark } from '@codemirror/theme-one-dark';
import { EditorView } from '@codemirror/view';
import { useCallback, useEffect, useRef, useState } from 'react';

import Text from '@src/components/primitives/Text/Text';

import { useWorkspace } from '../../../core/useWorkspace';
import { fetchYamlFile } from '../../../services/yamlFileService';
import { useCodeMirrorTheme } from '../../hooks/useCodeMirrorTheme';
import { useCodeMirrorView } from '../../hooks/useCodeMirrorView';
import { useYamlValidation } from '../../hooks/useYamlValidation';
import { createBaseExtensions } from '../../utils/codemirrorExtensions';
import { buildFileList } from '../../utils/yamlFileList';

import YamlEditorToolbar from './YamlEditorToolbar';

const DEBOUNCE_MS = 300;

export interface YamlEditorProps {
  /** Called with the editor content after 300ms debounce. */
  onChange?: (text: string) => void;
  /** Called when the active file changes. */
  onActiveFileChange?: (filePath: string) => void;
}

/** CodeMirror YAML Editor with syntax highlighting and Zod-based inline validation. */
export default function YamlEditor({ onChange, onActiveFileChange }: YamlEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const themeCompartment = useCodeMirrorTheme(viewRef);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const onChangeRef = useRef(onChange);
  const onActiveFileChangeRef = useRef(onActiveFileChange);
  const lintCompartment = useRef(new Compartment());
  const { workspace } = useWorkspace();

  const fileList = buildFileList(workspace?.objects ?? []);
  const [activeFile, setActiveFile] = useState(fileList[0]);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { lintExtension } = useYamlValidation(activeFile.path);

  // Keep refs in sync with latest callbacks (avoids stale closures in CM listener)
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    onActiveFileChangeRef.current = onActiveFileChange;
  }, [onActiveFileChange]);

  // Reconfigure lint extension when it changes (file switch → schema change)
  useEffect(() => {
    if (!viewRef.current) return;
    viewRef.current.dispatch({
      effects: lintCompartment.current.reconfigure(lintExtension),
    });
  }, [lintExtension]);

  // Notify parent when active file changes
  useEffect(() => {
    onActiveFileChangeRef.current?.(activeFile.path);
  }, [activeFile]);

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  // Reset loading state when file changes (adjusting state during render)
  const [prevFilePath, setPrevFilePath] = useState(activeFile.path);
  if (prevFilePath !== activeFile.path) {
    setPrevFilePath(activeFile.path);
    setLoading(true);
    setError(null);
  }

  // Load file content (setState only in async callbacks)
  useEffect(() => {
    let cancelled = false;

    fetchYamlFile(activeFile.path)
      .then((text) => {
        if (!cancelled) {
          setContent(text);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err));
          setContent('');
          setLoading(false);
        }
      });

    return () => { cancelled = true; };
  }, [activeFile]);

  useCodeMirrorView(editorRef, viewRef, () => {
    const isDark = document.documentElement.classList.contains('dark');
    return [
      ...createBaseExtensions(),
      lintCompartment.current.of(lintExtension),
      EditorView.updateListener.of((update) => {
        if (!update.docChanged) return;
        const text = update.state.doc.toString();
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
          onChangeRef.current?.(text);
        }, DEBOUNCE_MS);
      }),
      themeCompartment.of(isDark ? oneDark : []),
    ];
  });

  // Update editor content when content changes (file switch)
  useEffect(() => {
    if (!viewRef.current) return;

    const currentContent = viewRef.current.state.doc.toString();
    if (currentContent !== content) {
      viewRef.current.dispatch({
        changes: {
          from: 0,
          to: currentContent.length,
          insert: content,
        },
      });
    }
  }, [content]);

  const handleFileSelect = useCallback((file: { label: string; path: string }) => {
    setActiveFile(file);
  }, []);

  const editorWrapperClass = 'relative rounded-md border';
  const loadingOverlayClass = 'absolute inset-0 z-10 flex items-center justify-center bg-background/50';
  const editorContainerClass = '[&_.cm-editor]:min-h-[500px] [&_.cm-editor]:h-[calc(100vh-280px)]';

  return (
    <div className="flex flex-col gap-3">
      <YamlEditorToolbar
        files={fileList}
        activeFilePath={activeFile.path}
        onSelect={handleFileSelect}
      />

      {/* Editor */}
      <div className={editorWrapperClass}>
        {loading && (
          <div className={loadingOverlayClass}>
            <Text size="sm" color="muted">Lade {activeFile.label}…</Text>
          </div>
        )}

        {error && (
          <div className="p-4">
            <Text size="sm" color="error">
              Fehler beim Laden von {activeFile.path}: {error}
            </Text>
          </div>
        )}

        <div
          ref={editorRef}
          className={editorContainerClass}
        />
      </div>
    </div>
  );
}
