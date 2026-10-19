import type { ImportModule } from '../../core/modulesSchema';
import type { Diagram, Workspace } from '../../core/workspaceSchema';
import type { NodePosition } from '../../services/elkLayoutService';
import type { DiagramEdge, DiagramNode } from '../../store/diagramSlice';

// ── Derived Model Builders (L4 modules) ────────────────────────────────────
// L3 components sind seit der Objekt-Persistenz `'objects'`-basiert und werden
// über `diagramModels`/`elkViewMapper` gerendert — nur L4 (module) ist eine
// reine modules[]-Projektion und nutzt die File-Modelle unten.

/**
 * Builds DiagramEdge[] for an L4 module view – gerade (`straight`) Import-Kanten.
 * Dedupliziert via `seen`-Set, keine Self-Imports, nur sichtbare Endpoints.
 */
export function buildModuleEdgeModels(
  modules: ImportModule[],
  positions: NodePosition[],
): DiagramEdge[] {
  const visibleNodeIds = new Set(positions.map((p) => p.id));
  const seen = new Set<string>();
  const edges: DiagramEdge[] = [];

  modules.forEach((m) => {
    m.imports.forEach((imp) => {
      if (imp === m.name) return;
      if (!visibleNodeIds.has(m.name) || !visibleNodeIds.has(imp)) return;

      const edgeId = `${m.name}__${imp}`;
      if (seen.has(edgeId)) return;
      seen.add(edgeId);

      edges.push({
        id: edgeId,
        source: m.name,
        target: imp,
        type: 'straight',
        data: {},
      });
    });
  });

  return edges;
}

/**
 * Builds DiagramNode[] for an L4 module view from `modules[]` + ELK positions.
 * Ein `file`-Node pro Modul (Membership aus `modules[]`, nie aus
 * `diagram.nodes`-Keys). Optionale group-Nodes entstehen nur, wenn eine Group
 * Mitglieder-Module enthält.
 */
export function buildModuleNodeModels(
  workspace: Workspace,
  modules: ImportModule[],
  positions: NodePosition[],
  diagram: Diagram | undefined,
): DiagramNode[] {
  const positionMap = new Map(positions.map((np) => [np.id, np]));
  const moduleByName = new Map(modules.map((m) => [m.name, m]));
  const nodes: DiagramNode[] = [];

  // Groups: nur solche, die Modul-Mitglieder enthalten (Muster buildDiagramNodeModels Z. 113–127).
  (workspace.groups ?? []).forEach((group) => {
    const hasModuleMember = (group.members ?? []).some((id) => moduleByName.has(id));
    if (!hasModuleMember) return;
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

  positions.forEach((pos) => {
    const module = moduleByName.get(pos.id);
    if (!module) return;
    const persisted = diagram?.nodes?.[module.name] as
      | { description?: string }
      | undefined;
    nodes.push({
      id: module.name,
      type: 'file',
      data: {
        name: module.name,
        fileName: module.name.split('.').at(-1) ?? module.name,
        path: module.path,
        description: persisted?.description,
      },
      position: pos.position,
      isTransient: false,
    });
  });

  return nodes;
}
