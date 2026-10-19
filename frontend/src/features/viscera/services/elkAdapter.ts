import ELK from 'elkjs/lib/elk.bundled.js';

import { CARD, GROUP_PADDING, TABLE, tableNodeHeight } from '../core/nodeDimensions';

import {
  FLAT_LAYOUT_OPTIONS,
  LANDSCAPE_LAYOUT_OPTIONS,
  snap,
} from './elkLayoutOptions';
import {
  collectAllNodeIds,
  isExternalContainer,
  selectDiagramNodeIds,
} from './elkViewMapper';

import type { DiagramLevelDefinition } from '../core/levelRegistry';
import type { ImportModule } from '../core/modulesSchema';
import type { Diagram, Workspace } from '../core/workspaceSchema';
import type { ElkExtendedEdge, ElkNode } from 'elkjs';

// ── Public Interfaces ───────────────────────────────────────────────────────

/**
 * Extended ELK node type with properties field for priority weighting.
 * The bundled elkjs TS types omit `properties`, but the ELK JSON format
 * supports it at runtime (e.g. `{ priority: "10" }` for node ordering).
 */
interface ElkNodeWithPriority extends ElkNode {
  properties?: Record<string, string>;
}

/** Position and dimensions of a layout element. x/y = top-left (React Flow convention). */
export interface LayoutPosition {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Input for computeLayout(). */
export interface LayoutRequest {
  workspace: Workspace;
  viewKey: string;
  /** Node-Drag overrides (Phase 2, sync). */
  overrides: Map<string, { x: number; y: number }>;
  /** Whether the diagram's nodes map was empty before this computation (#2232). */
  nodesEmpty: boolean;
  /** L4 module list – required for `layoutStrategy: 'modules'` (Membership aus modules[]). */
  modules?: ImportModule[];
  /** Ephemeres derived-Diagramm (L3/L4) – Resolver-Fallback für lazy Views (#2491). */
  derivedDiagram?: Diagram | null;
}

/** Output from computeLayout(). */
export interface LayoutResponse {
  positions: NodePosition[];
  /** ELK computation time in milliseconds. */
  durationMs: number;
  /** True if nodes map was empty before compute — signals that positions should be persisted (#2232). */
  wasInitial: boolean;
}

/** React Flow Node position output. */
export interface NodePosition {
  id: string;
  position: { x: number; y: number };
  width: number;
  height: number;
}

// ── ELK.js ─────────────────────────────────────────────────────────────────

const elk = new ELK();

// ── Graph Builders ─────────────────────────────────────────────────────────

/**
 * Compute positions for a flat level view (Container L2, Component L3) –
 * the `flat` registry strategy.
 *
 * Membership source is the diagram's nodes-map keys (#2302). An empty map
 * (fresh scanner diagram) falls back to the registry-driven selector
 * `selectDiagramNodeIds`; the persist path (#2232) fills the map on the
 * first layout run. Without a matching Diagram nothing is laid out.
 */
export async function buildFlatGraph(
  workspace: Workspace,
  diagram: Diagram,
  level: DiagramLevelDefinition,
): Promise<Map<string, LayoutPosition>> {
  // Registry guard: buildFlatGraph serves only `flat` levels –
  // computeLayout dispatches here exclusively for those (no throw in the layout path).
  if (level.layoutStrategy !== 'flat') return new Map();

  const nodeIds = Object.keys(diagram.nodes ?? {});
  const candidateIds = nodeIds.length > 0
    ? nodeIds
    : selectDiagramNodeIds(diagram, workspace);
  // L2 (container) und L3 (component) übernehmen die DOWN-Ausrichtung aus L1
  // (Rollen/Systeme oben, darunter abhängige Module) statt FLAT/RIGHT.
  const options =
    level.diagramType === 'container' || level.diagramType === 'component'
      ? LANDSCAPE_LAYOUT_OPTIONS
      : FLAT_LAYOUT_OPTIONS;
  return layoutContainerFromIds(workspace, candidateIds, options);
}

/**
 * Compute positions for SystemContext (Level 1):
 * All people + all systems with system-level edges.
 *
 * Groups (workspace.groups, Finding 9) are treated as hierarchical ELK parent nodes.
 * Their `members` children are nested inside the group, positioned relative
 * to the group. Non-group systems and people stay as top-level children.
 */
export async function buildSystemContextGraph(workspace: Workspace): Promise<Map<string, LayoutPosition>> {
  const children: ElkNodeWithPriority[] = [];

  // Collect IDs of systems that are members of a group
  const groupIds = new Set((workspace.groups ?? []).map((group) => group.id));
  const groupMemberIds = new Set<string>();
  (workspace.groups ?? []).forEach((group) => {
    group.members.forEach((memberId) => groupMemberIds.add(memberId));
  });

  // Non-group systems that are NOT members of a group → top-level children.
  // L1 (systemContext) scopedTypes = ['system'] (#2523): only `type === 'system'`
  // objects belong — tables/containers/data_store must never be laid out here,
  // otherwise they leak into result.positions and get persisted back into the
  // diagram YAML nodes map (Reset-Layout-Karteileichen).
  workspace.objects
    .filter((system) => system.type === 'system')
    .forEach((system) => {
      if (groupMemberIds.has(system.id)) return; // positioned inside group
      children.push({
        id: system.id,
        width: CARD.width,
        height: CARD.height,
        properties: {
          priority: system.external ? '1' : '10',
        },
      });
    });

  workspace.people.forEach((person) => {
    children.push({
      id: person.id,
      width: CARD.width,
      height: CARD.height,
    });
  });

  // Groups: hierarchical parent nodes with children from `members`
  (workspace.groups ?? []).forEach((group) => {
    const groupChildNodes: ElkNodeWithPriority[] = [];
    group.members.forEach((memberId) => {
      if (groupIds.has(memberId)) return; // groups cannot be members (no nesting)
      const childSystem = workspace.objects.find(
        (s) => s.id === memberId && s.type === 'system',
      );
      if (childSystem) {
        groupChildNodes.push({
          id: childSystem.id,
          width: CARD.width,
          height: CARD.height,
          properties: {
            priority: childSystem.external ? '1' : '10',
          },
        });
      }
    });

    children.push({
      id: group.id,
      layoutOptions: {
        'elk.padding': `[top=${GROUP_PADDING.top},left=${GROUP_PADDING.left},bottom=${GROUP_PADDING.bottom},right=${GROUP_PADDING.right}]`,
      },
      children: groupChildNodes.length > 0 ? groupChildNodes : undefined,
    });
  });

  const seen = new Set<string>();
  const edges: ElkExtendedEdge[] = [];

  // Collect all node IDs once (top-level + nested in groups)
  const allIds = collectAllNodeIds(children);

  // Ein System wie `gjo-se.com` (Punkt im Namen) ist KEIN Container-Pfad und
  // darf nicht auf `.split('.')[0]` reduziert werden (sonst -> 'gjo' und die
  // gjo-se.com-Edges fallen aus dem Layout).
  const isSystemId = (id: string) =>
    workspace.objects.some((o) => o.id === id && o.type === 'system');

  workspace.edges.forEach((rel) => {
    const fromSystem = rel.from.includes('.') && !isSystemId(rel.from) ? rel.from.split('.')[0] : rel.from;
    const toSystem = rel.to.includes('.') && !isSystemId(rel.to) ? rel.to.split('.')[0] : rel.to;
    if (fromSystem === toSystem) return;

    // Check if both endpoints are present (including inside groups)
    if (!allIds.has(fromSystem) || !allIds.has(toSystem)) return;

    const key = `${fromSystem}__${toSystem}`;
    if (seen.has(key)) return;
    seen.add(key);

    edges.push({ id: key, sources: [fromSystem], targets: [toSystem] });
  });

  const graph: ElkNode = {
    id: 'root',
    layoutOptions: LANDSCAPE_LAYOUT_OPTIONS,
    children,
    edges,
  };

  const result = await elk.layout(graph);
  return extractElkPositions(result);
}

// ── ELK Position Extraction ────────────────────────────────────────────────

/**
 * Extract {x, y, width, height} from ELK layout output (recursive).
 * Snaps to the grid; recurses into group children (positions relative to parent).
 * Exported für den L4-Module-Adapter (elkModulesAdapter).
 */
export function extractElkPositions(elkGraph: ElkNode): Map<string, LayoutPosition> {
  const map = new Map<string, LayoutPosition>();
  if (!elkGraph.children) return map;
  elkGraph.children.forEach((child) => {
    const w = child.width ?? 0;
    const h = child.height ?? 0;
    map.set(child.id, {
      x: snap(child.x ?? 0),
      y: snap(child.y ?? 0),
      width: w,
      height: h,
    });

    // Recurse into group children (ELK positions them relative to the group)
    if (child.children && child.children.length > 0) {
      const nestedPositions = extractElkPositions(child);
      nestedPositions.forEach((pos, id) => {
        map.set(id, pos);
      });
    }
  });
  return map;
}

/**
 * Builds ELK children (external-priority weighting) and edges from workspace.edges
 * where both endpoints are present, then runs elk.layout.
 */
async function layoutContainerFromIds(
  workspace: Workspace,
  candidateIds: string[],
  layoutOptions: Record<string, string>,
): Promise<Map<string, LayoutPosition>> {
  const children: ElkNodeWithPriority[] = [];
  const seen = new Set<string>();

  candidateIds.forEach((id) => {
    if (seen.has(id)) return;
    seen.add(id);
    // Dimension aus dem Object-Type auflösen: `table`-Nodes (ER) nutzen die
    // DB-Card-Maße (Höhe folgt der Spaltenanzahl), alles andere CARD.
    const object = workspace.objects.find((o) => o.id === id);
    const width = object?.type === 'table' ? TABLE.width : CARD.width;
    const height = object?.type === 'table' ? tableNodeHeight(object.columns?.length ?? 0) : CARD.height;
    children.push({
      id,
      width,
      height,
      properties: {
        priority: isExternalContainer(workspace, id) ? '1' : '10',
      },
    });
  });

  const childIds = new Set(children.map((c) => c.id));
  const edges: ElkExtendedEdge[] = [];
  workspace.edges.forEach((rel) => {
    if (childIds.has(rel.from) && childIds.has(rel.to) && rel.from !== rel.to) {
      edges.push({ id: `${rel.from}__${rel.to}`, sources: [rel.from], targets: [rel.to] });
    }
  });

  const graph: ElkNode = {
    id: 'root',
    layoutOptions,
    children,
    edges,
  };

  const result = await elk.layout(graph);
  return extractElkPositions(result);
}
