import { ReactFlowProvider } from '@xyflow/react';
import * as yaml from 'js-yaml';
import { useEffect, useMemo, useState } from 'react';

import Alert from '@src/components/primitives/Alert/Alert';

import { useWorkspace } from '../../../core/useWorkspace';
import { workspaceSchema } from '../../../core/workspaceSchema';
import VisceraReactFlow from '../../../viewer/VisceraReactFlow';
import { formatYamlError, formatZodError, mergeFileIntoWorkspace } from '../../utils/yamlUtils';

import type { Workspace } from '../../../core/workspaceSchema';

export interface LivePreviewProps {
  /** Path of the file currently being edited (e.g. "/architecture/systems/backend.yml"). */
  activeFilePath: string;
  /** Raw YAML text from the editor (single file, already debounced by YamlEditor). */
  yamlText: string;
}

interface ParseResult {
  workspace: Workspace | null;
  error: string | null;
}

/**
 * Live preview that parses debounced YAML input, merges it into the
 * base workspace, validates against the Zod schema, and pushes the
 * result into the shared workspace context so ArchitectureDiagram
 * re-renders in real time.
 *
 * On parse/validation errors the last valid diagram is kept and an
 * error banner is shown above the preview.
 */
export default function LivePreview({ yamlText, activeFilePath }: LivePreviewProps) {
  const { workspace: serverWorkspace, error: loadError, updateWorkspace } = useWorkspace();

  // Capture the server-fetched base workspace once via derived-state pattern.
  // Subsequent updateWorkspace calls change the context workspace but NOT this base.
  const [baseWorkspace, setBaseWorkspace] = useState<Workspace | null>(null);
  if (serverWorkspace && !baseWorkspace) {
    setBaseWorkspace(serverWorkspace);
  }

  // Parse + merge + validate (pure computation, no side effects)
  const parseResult = useMemo<ParseResult>(() => {
    if (!baseWorkspace || !yamlText.trim()) return { workspace: null, error: null };

    let parsed: unknown;
    try {
      parsed = yaml.load(yamlText);
    } catch (err) {
      return { workspace: null, error: formatYamlError(err) };
    }

    const merged = mergeFileIntoWorkspace(baseWorkspace, activeFilePath, parsed);
    const result = workspaceSchema.safeParse(merged);
    if (result.success) {
      return { workspace: result.data, error: null };
    }
    return { workspace: null, error: formatZodError(result.error.issues) };
  }, [baseWorkspace, yamlText, activeFilePath]);

  // Push valid parse result into the shared workspace context
  useEffect(() => {
    if (parseResult.workspace) {
      updateWorkspace(parseResult.workspace);
    }
  }, [parseResult, updateWorkspace]);

  return (
    <div className="flex flex-col gap-2">
      {parseResult.error && (
        <Alert variant="destructive" role="alert">
          {parseResult.error}
        </Alert>
      )}
      {loadError && !parseResult.error && (
        <Alert variant="destructive" role="alert">
          {loadError}
        </Alert>
      )}
      <ReactFlowProvider>
        <VisceraReactFlow currentViewKey="SystemContext" onViewKeyChange={() => {}} />
      </ReactFlowProvider>
    </div>
  );
}
