import ELK from 'elkjs/lib/elk.bundled.js';

import { FILE } from '../core/nodeDimensions';

import { extractElkPositions } from './elkAdapter';
import { FLAT_LAYOUT_OPTIONS } from './elkLayoutOptions';
import { selectDiagramNodeIds } from './elkViewMapper';

import type { LayoutPosition } from './elkAdapter';
import type { ImportModule } from '../core/modulesSchema';
import type { Diagram, Workspace } from '../core/workspaceSchema';
import type { ElkExtendedEdge, ElkNode } from 'elkjs';

// ── ELK.js ─────────────────────────────────────────────────────────────────

const elk = new ELK();

/**
 * Baue die Import-Edges für eine L4 module Projektion.
 *
 * Datei-Importe `m.name → imp` (nur sichtbare Endpoints) — dedupliziert via
 * `edgeSeen`-Set, keine Self-Imports.
 */
function buildModuleEdges(
  modules: ImportModule[],
  childIds: Set<string>,
): ElkExtendedEdge[] {
  const edgeSeen = new Set<string>();
  const edges: ElkExtendedEdge[] = [];
  modules.forEach((m) => {
    if (!childIds.has(m.name)) return;
    m.imports.forEach((imp) => {
      if (imp === m.name || !childIds.has(imp)) return;
      const key = `${m.name}__${imp}`;
      if (edgeSeen.has(key)) return;
      edgeSeen.add(key);
      edges.push({ id: key, sources: [m.name], targets: [imp] });
    });
  });
  return edges;
}

/**
 * Compute positions for an L4 module view (`dataSource: 'modules'`) — one ELK
 * node per Datei aus `modules[]` plus Import-Kanten.
 *
 * Membership IMMER aus `modules[]` via `selectDiagramNodeIds` — NIEMALS
 * `Object.keys(diagram.nodes)` (die nodes-Map ist bei L4 spärlich, nur
 * User-Overrides/Descriptions). Positions sind reine Layout-Projektion (ELK)
 * und werden NICHT persistiert (kein #2232-Auto-Persist).
 */
export async function buildModuleGraph(
  workspace: Workspace,
  diagram: Diagram,
  modules: ImportModule[],
): Promise<Map<string, LayoutPosition>> {
  const candidateIds = selectDiagramNodeIds(diagram, workspace, modules);

  const seen = new Set<string>();
  const children: ElkNode[] = [];
  candidateIds.forEach((id) => {
    if (seen.has(id)) return;
    seen.add(id);
    children.push({ id, width: FILE.width, height: FILE.height });
  });

  const childIds = new Set(children.map((c) => c.id));
  const edges = buildModuleEdges(modules, childIds);

  const graph: ElkNode = {
    id: 'root',
    layoutOptions: FLAT_LAYOUT_OPTIONS,
    children,
    edges,
  };

  const result = await elk.layout(graph);
  return extractElkPositions(result);
}
