import { getDiagramLevel } from '../core/levelRegistry';

import type { ImportModule } from '../core/modulesSchema';
import type { Diagram, Workspace } from '../core/workspaceSchema';
import type { ElkNode } from 'elkjs';

// ── Node Collection ──────────────────────────────────────────────────────────

/** Recursively collect all node IDs from ELK children (including nested groups). */
export function collectAllNodeIds(children: ElkNode[]): Set<string> {
  const ids = new Set<string>();
  children.forEach((child) => {
    ids.add(child.id);
    if (child.children) {
      const nested = collectAllNodeIds(child.children);
      nested.forEach((id) => ids.add(id));
    }
  });
  return ids;
}

// ── External Flag Resolution ─────────────────────────────────────────────────

/** Resolve the external flag for a container via its parent object. */
export function isExternalContainer(workspace: Workspace, containerId: string): boolean {
  const object = workspace.objects.find((o) => o.id === containerId);
  if (!object) return false;
  if (object.parent) {
    const parent = workspace.objects.find((o) => o.id === object.parent);
    return parent?.external ?? false;
  }
  return object.external ?? false;
}

// ── Diagram Node Selection ───────────────────────────────────────────────────

/**
 * Generic candidate selector for all diagram levels (L1–L4) – one algorithm
 * driven by the level registry (`getDiagramLevel`):
 *
 * 0. modules: derived Projektion aus `modules[]` (dataSource 'modules'),
 *    nur L4 (module) → Module mit `top_level === diagram.parent`.
 * 1. scoped: objects with `type ∈ level.scopedTypes`; flat levels (L2/L3)
 *    additionally require `parent === diagram.parent`, L1 has no parent filter.
 * 2. connected (flat levels only): edge endpoints touching exactly one
 *    scoped endpoint (the non-scoped endpoint is added; exact endpoint IDs, no
 *    dot-mapping). L1 adds no connected candidates – container endpoints would
 *    otherwise surface as non-renderable nodes on the system context.
 * 3. people: `includePeople === 'always'` → all persons; `'connected'` → only
 *    persons related to a scoped node.
 *
 * Return order: modules (L4) → scoped → connected → people (deduplicated).
 *
 * Used when the diagram's nodes-map is empty (fresh scanner diagram);
 * the persist path (#2232) writes the resulting positions into the
 * nodes-map on the first layout run. Derived L4 (dataSource 'modules')
 * leitet Membership immer aus `modules[]` ab — nie aus der nodes-Map.
 */
export function selectDiagramNodeIds(
  diagram: Diagram,
  workspace: Workspace,
  modules?: ImportModule[],
): string[] {
  const level = getDiagramLevel(diagram.type);

  // 0. Derived L4: Membership aus modules[] (kein Objekt-Persist).
  //    Nur L4 trägt `dataSource: 'modules'`; L3 components sind objects-basiert
  //    und laufen über den scoped/connected-Zweig darunter.
  if (level.dataSource === 'modules') {
    const moduleList = modules ?? [];
    const parent = diagram.parent;
    const ids = new Set<string>();
    moduleList.forEach((m) => {
      if (parent !== null && m.top_level === parent) ids.add(m.name);
    });
    return [...ids];
  }

  // 1. Scoped objects – L1 (hierarchicalGroups) scopes globally,
  //    L2/L3 (flat) are parent-scoped. `dataModel` (ER) scopes global:
  //    Membership läuft über `base` (INC 4) – Table-Nodes werden je Diagramm
  //    über `obj.parent === diagram.base` gefiltert (`er-core` ↔ core,
  //    `er-gjo` ↔ gjo_se_com), nicht über `diagram.parent`.
  const scoped = new Set<string>();
  const isBaseScoped = level.diagramType === 'dataModel';
  const parentScoped = level.layoutStrategy === 'flat' && !isBaseScoped;
  workspace.objects.forEach((obj) => {
    if (obj.type === undefined || !level.scopedTypes.includes(obj.type)) return;
    if (isBaseScoped && obj.parent !== diagram.base) return; // Membership via base
    if (parentScoped && obj.parent !== diagram.parent) return;
    scoped.add(obj.id);
  });

  // 2. Connected nodes: edge endpoints touching exactly one scoped endpoint
  //    (flat levels only – L1 systems are fully covered by their scoped set).
  //    Nur SUPPORTING-Typen (system/person) dürfen via Edge ins Diagramm –
  //    Primärelemente (container/store/component/table) werden per Typ+Hierarchie
  //    (scoped) bestimmt und dürfen NICHT per connected reinkommen (sonst leakt
  //    ein Container mit falschem parent, z. B. minio-init → minio, in L2).
  const connected = new Set<string>();
  if (level.layoutStrategy === 'flat') {
    const typeById = new Map<string, string>();
    workspace.objects.forEach((obj) => typeById.set(obj.id, obj.type ?? ''));
    const isSupporting = (id: string) => {
      const t = typeById.get(id);
      return t === 'system' || t === 'person';
    };
    workspace.edges.forEach((rel) => {
      if (scoped.has(rel.from) && !scoped.has(rel.to) && isSupporting(rel.to)) connected.add(rel.to);
      if (scoped.has(rel.to) && !scoped.has(rel.from) && isSupporting(rel.from)) connected.add(rel.from);
    });
  }

  // 3. People per level contract
  const people = new Set<string>();
  if (level.includePeople === 'always') {
    workspace.people.forEach((person) => people.add(person.id));
  } else {
    workspace.people.forEach((person) => {
      const isConnected = workspace.edges.some(
        (rel) =>
          (rel.from === person.id && scoped.has(rel.to)) ||
          (rel.to === person.id && scoped.has(rel.from)),
      );
      if (isConnected) people.add(person.id);
    });
  }

  const ids = new Set<string>();
  scoped.forEach((id) => ids.add(id));
  connected.forEach((id) => ids.add(id));
  people.forEach((id) => ids.add(id));
  return [...ids];
}
