import { cva } from 'class-variance-authority';
import { useCallback, useEffect, useMemo, useState } from 'react';

import Button from '@src/components/primitives/Button/Button';
import Spinner from '@src/components/primitives/Spinner/Spinner';
import Text from '@src/components/primitives/Text/Text';
import { useEntityCache } from '@src/features/viscera/core/useEntityCache';
import { useWorkspace } from '@src/features/viscera/core/useWorkspace';
import { tagValues } from '@src/features/viscera/core/workspaceSchema';
import type { ArchitectureObject, Edge } from '@src/features/viscera/core/workspaceSchema';
import { useViewState } from '@src/features/viscera/hooks/useViewState';

import InfoPanel from '../panel/InfoPanel';

import Breadcrumb from './Breadcrumb';

const ROOT_CLASS = 'flex h-full flex-col bg-white dark:bg-gray-950' as const;
const ERROR_BOX_CLASS = 'rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-950' as const;
const svgWrapVariants = cva('flex h-full w-full items-center justify-center');

/**
 * Viewer for a container detail diagram.
 *
 * - If the container has a `d2` or `stately` field, fetches the SVG from
 *   `/architecture/diagrams/rendered/<value>` and renders it inline.
 * - If no diagram field exists, falls back to `<InfoPanel>` showing the
 *   container description (LLM-ready), tags, technology, and edges.
 */
export default function DetailDiagramViewer() {
  const { detailContainerId, setDetailContainer } = useViewState();
  const { workspace } = useWorkspace();
  const { technologyMap } = useEntityCache();

  const [svgContent, setSvgContent] = useState<string | null>(null);
  const [svgLoading, setSvgLoading] = useState(false);
  const [svgError, setSvgError] = useState<string | null>(null);

  // Resolve the container from the flat workspace object list (Finding 1/2)
  const container = useMemo<ArchitectureObject | null>(() => {
    if (!detailContainerId || !workspace) return null;
    return workspace.objects.find((o) => o.id === detailContainerId) ?? null;
  }, [detailContainerId, workspace]);

  // Technology display name derived from the first slug in technologies[] (#2333)
  const technologyName = useMemo<string>(() => {
    const slug = container?.technologies?.[0];
    if (!slug) return '';
    return technologyMap.get(slug)?.name ?? slug;
  }, [container, technologyMap]);

  // Resolve the system name for breadcrumb via the container's parent reference
  const systemName = useMemo<string | undefined>(() => {
    if (!container?.parent || !workspace) return undefined;
    return workspace.objects.find((o) => o.id === container.parent)?.name;
  }, [container, workspace]);

  // Filter edges that involve this container
  const edges = useMemo<Edge[]>(() => {
    if (!detailContainerId || !workspace) return [];
    return workspace.edges.filter(
      (rel) => rel.from === detailContainerId || rel.to === detailContainerId,
    );
  }, [detailContainerId, workspace]);

  // Determine which diagram source to use
  const diagramSource = container?.d2 || container?.stately || null;
  const diagramType = container?.d2 ? 'D2' : container?.stately ? 'Stately' : null;

  // Fetch SVG
  const loadSvg = useCallback(async (source: string) => {
    setSvgLoading(true);
    setSvgError(null);
    setSvgContent(null);
    try {
      const url = `/architecture/diagrams/rendered/${source}`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const text = await response.text();
      setSvgContent(text);
    } catch (err) {
      setSvgError(err instanceof Error ? err.message : String(err));
    } finally {
      setSvgLoading(false);
    }
  }, []);

  useEffect(() => {
    if (diagramSource) {
      loadSvg(diagramSource);
    }
  }, [diagramSource, loadSvg]);

  const handleBack = useCallback(() => {
    setDetailContainer(null);
  }, [setDetailContainer]);

  // Guard: no detail active
  if (!detailContainerId) return null;

  // Guard: container not found
  if (!container) {
    return (
      <div className={ROOT_CLASS}>
        <div className="px-4 py-3">
          <Breadcrumb systemName={systemName} detailDiagramName={detailContainerId} />
        </div>
        <div className="flex flex-1 items-center justify-center">
          <Text color="error">Container &quot;{detailContainerId}&quot; not found.</Text>
        </div>
      </div>
    );
  }

  const diagramName = container.name;

  return (
    <div className={ROOT_CLASS}>
      {/* Header with breadcrumb */}
      <div className="flex items-center justify-between px-4 py-3">
        <Breadcrumb
          systemName={systemName}
          detailDiagramName={diagramType ? `${diagramName} (${diagramType})` : diagramName}
        />
        <Button variant="outline" size="sm" onClick={handleBack}>
          ← Zurück
        </Button>
      </div>

      {/* Content */}
      {diagramSource ? (
        <div className="flex flex-1 flex-col items-center justify-center overflow-auto p-4">
          {svgLoading && (
            <div className="flex items-center gap-2">
              <Spinner size="sm" />
              <Text color="muted" size="sm">Loading diagram…</Text>
            </div>
          )}
          {svgError && (
            <div className={ERROR_BOX_CLASS}>
              <Text color="error">Failed to load diagram: {svgError}</Text>
            </div>
          )}
          {svgContent && !svgLoading && (
            <div
              className={svgWrapVariants()}
              dangerouslySetInnerHTML={{ __html: svgContent }}
            />
          )}
        </div>
      ) : (
        <div className="flex-1 overflow-auto">
          <InfoPanel
            containerName={container.name}
            technologyName={technologyName}
            description={container.description}
            tags={tagValues(container.tags)}
            edges={edges}
          />
        </div>
      )}
    </div>
  );
}
