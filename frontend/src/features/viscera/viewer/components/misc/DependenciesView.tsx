import { useCallback } from 'react';

import Button from '@src/components/primitives/Button/Button';
import Text from '@src/components/primitives/Text/Text';
import type { Diagram, Edge } from '@src/features/viscera/core/workspaceSchema';
import { useViewState } from '@src/features/viscera/hooks/useViewState';

// ── Props ────────────────────────────────────────────────────────────────────

export interface DependenciesViewProps {
  objectId: string;
  edges: Edge[];
  diagrams: Diagram[];
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Find diagrams whose node map contains the root system of either `from` or `to`. */
function findDiagramsForEdge(from: string, to: string, diagrams: Diagram[]): Diagram[] {
  const fromRoot = getRootSystem(from);
  const toRoot = getRootSystem(to);

  return diagrams.filter((diagram) => {
    const nodeIds = Object.keys(diagram.nodes ?? {});
    return nodeIds.includes(fromRoot) || nodeIds.includes(toRoot);
  });
}

/** Extract root system from an object ID (e.g. "backend.llmPipeline" → "backend"). */
function getRootSystem(id: string): string {
  const dotIndex = id.indexOf('.');
  return dotIndex === -1 ? id : id.slice(0, dotIndex);
}

// ── Styles ───────────────────────────────────────────────────────────────────

const ROW_CLASS =
  'flex flex-col gap-1 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-900 rounded px-2 -mx-2 transition-colors';

const TECH_BADGE_CLASS =
  'rounded bg-gray-100 px-1.5 py-0.5 text-gray-600 dark:bg-gray-800 dark:text-gray-400';

// ── DependenciesView ─────────────────────────────────────────────────────────

/**
 * Lists all edges for a selected object, grouped by Incoming and Outgoing.
 *
 * - Incoming: edges where this object is the `to` target
 * - Outgoing: edges where this object is the `from` source
 * - Each edge row shows From→To, description, technology badge, and
 *   clickable diagram links that navigate to the corresponding diagram.
 */
export function DependenciesView({ objectId, edges, diagrams }: DependenciesViewProps) {
  const { setViewKey } = useViewState();

  const incoming = edges.filter((edge) => edge.to === objectId);
  const outgoing = edges.filter((edge) => edge.from === objectId);

  const handleDiagramClick = useCallback(
    (diagramKey: string) => {
      setViewKey(diagramKey);
    },
    [setViewKey],
  );

  const renderSection = (
    title: string,
    edges: Edge[],
  ) => (
    <div>
      <div className="mb-2">
        <Text weight="semibold" size="sm">
          {title} ({edges.length})
        </Text>
      </div>

      {edges.length === 0 ? (
        <Text color="muted" size="sm">
          No {title.toLowerCase()} edges
        </Text>
      ) : (
        <div className="divide-y divide-gray-100 dark:divide-gray-800">
          {edges.map((edge) => {
            const edgeDiagrams = findDiagramsForEdge(edge.from, edge.to, diagrams);

            return (
              <div key={`${edge.from}-${edge.to}`} className={ROW_CLASS}>
                {/* From → To */}
                <div className="flex items-center gap-1.5">
                  <Text size="sm">{edge.from}</Text>
                  <Text color="muted" size="sm">
                    →
                  </Text>
                  <Text size="sm">{edge.to}</Text>
                </div>

                {/* Description */}
                <Text color="muted" size="xs">
                  {edge.description || '—'}
                </Text>

                {/* Technology Badge */}
                {edge.technology && (
                  <div className={TECH_BADGE_CLASS}>
                    <Text as="span" size="xs" weight="medium" color="inherit">
                      {edge.technology}
                    </Text>
                  </div>
                )}

                {/* Diagrams */}
                {edgeDiagrams.length > 0 && (
                  <div className="mt-0.5 flex flex-wrap items-center gap-1">
                    <Text color="muted" size="xs">
                      Diagrams:
                    </Text>
                    {edgeDiagrams.map((diagram) => (
                      <Button
                        key={diagram.key}
                        variant="link"
                        size="sm"
                        onClick={() => handleDiagramClick(diagram.key)}
                      >
                        {diagram.key}
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  return (
    <div className="flex flex-col gap-6 py-2">
      {renderSection('Outgoing', outgoing)}
      {renderSection('Incoming', incoming)}
    </div>
  );
}
