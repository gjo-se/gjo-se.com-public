import { getCardKind, NODE_TYPE_BY_KIND } from '../../core/cardKindRegistry';
import { resolveActiveDiagram } from '../../core/derivedDiagram';
import { getDiagramLevel } from '../../core/levelRegistry';
import { selectDiagramNodeIds } from '../../services/elkViewMapper';


import type { Adr } from '../../adrs/hooks/useAdrs';
import type { ChildDiagram, Diagram, Workspace } from '../../core/workspaceSchema';
import type { NodePosition } from '../../services/elkLayoutService';
import type { DiagramEdge, DiagramNode } from '../../store/diagramSlice';

// ── Diagram Model Builders ───────────────────────────────────────────────────

/**
 * Builds DiagramEdge[] from raw Workspace edges for a given view.
 * Handles container→System ID resolution, deduplication, and visibility filtering.
 */
export function buildDiagramEdgeModels(
  workspace: Workspace,
  positions: NodePosition[],
  currentViewKey: string,
  derivedDiagram?: Diagram | null,
): DiagramEdge[] {
  if (!workspace.edges?.length) return [];

  const diagram = resolveActiveDiagram(workspace, currentViewKey, derivedDiagram ?? null);
  const edgeResolution = diagram
    ? getDiagramLevel(diagram.type).edgeResolution
    : 'direct';

  // Build set of visible node IDs from the current layout
  const visibleNodeIds = new Set(positions.map((p) => p.id));

  // Also include group node IDs
  workspace.groups?.forEach((g) => visibleNodeIds.add(g.id));

  const seen = new Set<string>();
  const edges: DiagramEdge[] = [];

  // systemLevel (L1): resolve container-level IDs to their parent system –
  // ABER nur fuer Nicht-System-IDs (Container/Component/Table mit Punkt-Pfad).
  // Ein System wie `gjo-se.com` (Punkt im Namen) darf NICHT reduziert werden,
  // sonst werden alle gjo-se.com-Edges ueber `.split('.')[0]` -> 'gjo' verworfen.
  const isSystemId = (id: string) =>
    workspace.objects.some((o) => o.id === id && o.type === 'system');

  workspace.edges.forEach((edge) => {
    const originalFrom = edge.from;
    const originalTo = edge.to;

    const from = edgeResolution === 'systemLevel'
      && originalFrom.includes('.') && !isSystemId(originalFrom)
      ? originalFrom.split('.')[0]
      : originalFrom;
    const to = edgeResolution === 'systemLevel'
      && originalTo.includes('.') && !isSystemId(originalTo)
      ? originalTo.split('.')[0]
      : originalTo;

    // Skip self-references and invisible nodes
    if (from === to) return;
    if (!visibleNodeIds.has(from) || !visibleNodeIds.has(to)) return;

    const edgeId = `${from}__${to}`;

    // Deduplicate: multiple container edges may map to same system edge
    if (seen.has(edgeId)) return;
    seen.add(edgeId);

    edges.push({
      id: edgeId,
      source: from,
      target: to,
      data: {
        label: edge.description,
        technology: edge.technology,
        tags: edge.tags,
        originalFrom,
        originalTo,
        // FK-Kanten (description 'references') im ER-Diagramm mit Crow's-Foot
        // kardinalität markieren (source=many, target=one).
        crowFoot: edge.description === 'references',
      },
    });
  });

  return edges;
}

/**
 * Builds DiagramNode[] from raw Workspace data + ELK positions for a given view.
 * This function populates `diagramSlice.nodes` as SSOT for the canvas.
 *
 * Ein Pfad für alle Level (L1–L3): Render-Entscheidung = Zugehörigkeit zur
 * Selektor-Menge (`selectDiagramNodeIds`) + Groups (nur `grouping: 'groups'`).
 * ReactFlow-Node-Typ + Card-Kind kommen ausschließlich aus `object.type`
 * via Registry (`NODE_TYPE_BY_KIND`, `getCardKind`).
 */
export function buildDiagramNodeModels(
  workspace: Workspace,
  positions: NodePosition[],
  currentViewKey: string,
  diagramsForParent: (parentId: string) => ChildDiagram[],
  getDecisionsForSystem?: (systemId: string) => Adr[],
  derivedDiagram?: Diagram | null,
): DiagramNode[] {
  const diagram = resolveActiveDiagram(workspace, currentViewKey, derivedDiagram ?? null);
  const level = diagram ? getDiagramLevel(diagram.type) : undefined;
  if (!diagram || !level) return [];

  const positionMap = new Map(positions.map((np) => [np.id, np]));
  const nodes: DiagramNode[] = [];

  // Render-Entscheidung: Selektor-Menge (scoped + connected + people) plus
  // Groups (eigene Entität, nur bei `grouping: 'groups'` Teil des Diagramms).
  const renderableIds = new Set([
    ...selectDiagramNodeIds(diagram, workspace),
    ...(level.grouping === 'groups' ? workspace.groups.map((g) => g.id) : []),
  ]);

  // Groups zuerst rendern (Finding 9) – Quelle: workspace.groups
  if (level.grouping === 'groups') {
    (workspace.groups ?? []).forEach((group) => {
      nodes.push({
        id: group.id,
        type: 'group',
        data: {
          name: group.name,
          members: group.members ?? [],
        },
        position: positionMap.get(group.id)?.position ?? { x: 0, y: 0 },
        isTransient: false,
      });
    });
  }

  // Positions-Iteration impliziert Sichtbarkeit; die Selektor-Menge entscheidet.
  positions.forEach((pos) => {
    const id = pos.id;
    if (!renderableIds.has(id)) return;

    // Person – verbunden mit einem scoped Node
    const person = workspace.people?.find((p) => p.id === id);
    if (person) {
      const decisions = getDecisionsForSystem?.(id);

      nodes.push({
        id,
        type: NODE_TYPE_BY_KIND.person,
        data: {
          name: person.name,
          description: person.description,
          kind: getCardKind(person.type ?? 'person'),
          tags: person.tags,
          status: person.status,
          decisions,
        },
        position: pos.position,
        isTransient: false,
      });
      return;
    }

    // Objekt (system/container/component/store) – Card-Wahl ausschließlich aus object.type
    const object = workspace.objects.find((o) => o.id === id);
    if (object) {
      // table (ER): schlanker DB-Card-Branch – nur Name/Beschreibung/Spalten,
      // keine kind/technology/annotations/childDiagrams.
      if (object.type === 'table') {
        nodes.push({
          id,
          type: NODE_TYPE_BY_KIND.table, // 'sqlTableCard'
          data: {
            name: object.name,
            description: object.description,
            columns: object.columns,
            // Status-Slug (viscera-*) für die S1-Statusfarbe wie bei den Cards.
            status: object.status,
          },
          position: pos.position,
          isTransient: false,
        });
        return;
      }

      const childDiagrams = diagramsForParent(id);
      const decisions = getDecisionsForSystem?.(id);
      const kind = getCardKind(object.type);

      nodes.push({
        id,
        type: NODE_TYPE_BY_KIND[kind],
        data: {
          name: object.name,
          description: object.description,
          kind,
          technology: object.technologies?.[0],
          technologies: object.technologies,
          tags: object.tags,
          status: object.status,
          external: object.external,
          d2: object.d2,
          annotations: object.annotations,
          childDiagrams: childDiagrams.length > 0 ? childDiagrams : undefined,
          decisions,
        },
        position: pos.position,
        isTransient: false,
      });
    }
  });

  return nodes;
}
