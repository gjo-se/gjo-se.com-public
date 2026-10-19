import { useMemo } from 'react';

import { resolveActiveDiagram } from '../../core/derivedDiagram';
import { useWorkspace } from '../../core/useWorkspace';
import { modelObjectTypeSchema, tagValues } from '../../core/workspaceSchema';
import { useViewState } from '../../hooks/useViewState';
import { useVisceraStore } from '../../store/visceraStore';

import type {
  Annotation,
  ArchitectureObject,
  Diagram,
  Flow,
  ModelObjectType,
  Person,
  TechnologyCandidate,
} from '../../core/workspaceSchema';
import type { DiagramNode } from '../../store/diagramSlice';

// ── Types ────────────────────────────────────────────────────────────────────

export interface DetailField {
  label: string;
  value: unknown;
  field: string;
  url?: string | null;
  /** Whether the field can be edited inline. */
  editable?: boolean;
  /** Editor variant for specialized field types. */
  editor?: 'text' | 'entity-multi' | 'entity-single' | 'toggle' | 'select';
  /** Dropdown options when editor === 'select'. */
  options?: { value: string; label: string }[];
}

export interface ObjectDetail {
  objectId: string | null;
  name: string;
  /** Normalized object type from the ``type`` field (SSOT) — undefined for unknown/invalid types. */
  type: ObjectType | undefined;
  description: string;
  tags: string[];
  technologies: string[];
  status: string | null;
  parentId: string | null;
  parentName: string | null;
  scope: string | null;
  diagrams: Diagram[];
  flows: Flow[];
  childrenCount: number;
  /** Annotations on this object (Greg→LLM communication). */
  annotations: Annotation[];
  /** Technology candidates from the scanner — UI suggestions, not assignments. */
  technologyCandidates: TechnologyCandidate[];
  /** Icon/Typ-Badge label */
  typeLabel: string;
  /** Available type options for the Type dropdown. */
  typeOptions: { value: string; label: string }[];
  /** Metadata fields for the Details tab. */
  fields: DetailField[];
  /** Derived (L3/L4) node — curation runs on diagram level, not on an object. */
  isDerived: boolean;
}

/** Model object type derived from the Zod schema (SSOT) — groups are a separate entity. */
export type ObjectType = ModelObjectType;

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Contains row — only rendered when the object has flat children. */
function buildContainsField(children: ArchitectureObject[]): DetailField[] {
  if (children.length === 0) return [];
  return [{ label: 'Contains', value: children.map((c) => c.name).join(', '), field: 'contains' }];
}

/** Flat children of an object (Finding 1/2: parent reference instead of nested lists). */
function findChildren(objects: ArchitectureObject[], parentId: string): ArchitectureObject[] {
  return objects.filter((o) => o.parent === parentId);
}

const COMPONENT_TYPE_OPTIONS = [{ value: 'component', label: 'Component' }];

function buildComponentDetail(
  component: ArchitectureObject,
  objects: ArchitectureObject[],
  diagrams: Diagram[],
  flows: Flow[],
): ObjectDetail {
  const componentType = component.type ?? 'component';
  const children = findChildren(objects, component.id);
  const parentContainer = objects.find((o) => o.id === component.parent);
  const parentSystem = objects.find((o) => o.id === parentContainer?.parent);

  const fields: DetailField[] = [
    { label: 'Name', value: component.name, field: 'name', editable: true },
    { label: 'Type', value: componentType, field: 'type', editable: true, editor: 'select', options: COMPONENT_TYPE_OPTIONS },
    { label: 'ID', value: component.id, field: 'id' },
    { label: 'Scope', value: parentSystem?.name ?? '\u2014', field: 'scope' },
    { label: 'Belongs to', value: parentContainer?.name ?? '\u2014', field: 'parent' },
    { label: 'Status', value: component.status ?? '', field: 'status', editable: true, editor: 'entity-single' },
    { label: 'External', value: '\u2014', field: 'external' },
    ...buildContainsField(children),
    { label: 'In Groups', value: '\u2014', field: 'in_groups' },
    { label: 'Diagrams', value: findDiagrams(component.id, diagrams).map((d) => d.key).join(', ') || '\u2014', field: 'diagrams' },
    { label: 'Flows', value: findFlows(component.id, flows).map((f) => f.id).join(', ') || '\u2014', field: 'flows' },
    { label: 'Tags', value: component.tags ?? [], field: 'tags', editable: true, editor: 'entity-multi' },
    { label: 'Technology', value: component.technologies ?? [], field: 'technologies', editable: true, editor: 'entity-multi' },
    { label: 'Links', value: '\u2014', field: 'links' },
    { label: 'Annotations', value: '\u2014', field: 'annotations' },
    { label: 'Description', value: component.description ?? '\u2014', field: 'description', editable: true },
  ];

  return {
    objectId: component.id,
    name: component.name,
    type: 'component',
    description: component.description ?? '',
    tags: tagValues(component.tags),
    technologies: component.technologies ?? [],
    status: component.status ?? null,
    parentId: component.parent ?? null,
    parentName: parentContainer?.name ?? null,
    scope: parentSystem?.name ?? null,
    diagrams: findDiagrams(component.id, diagrams),
    flows: findFlows(component.id, flows),
    childrenCount: children.length,
    typeLabel: 'Component',
    typeOptions: COMPONENT_TYPE_OPTIONS,
    annotations: [],
    technologyCandidates: component.scan_meta?.technology_candidates ?? [],
    fields,
    isDerived: false,
  };
}

const CONTAINER_TYPE_OPTIONS = [
  { value: 'container', label: 'Container' },
  { value: 'store', label: 'Store' },
];

function buildContainerDetail(
  container: ArchitectureObject,
  objects: ArchitectureObject[],
  diagrams: Diagram[],
  flows: Flow[],
): ObjectDetail {
  const containerType = container.type ?? 'container';
  const children = findChildren(objects, container.id);
  const parentSystem = objects.find((o) => o.id === container.parent);

  const fields: DetailField[] = [
    { label: 'Name', value: container.name, field: 'name', editable: true },
    { label: 'Type', value: containerType, field: 'type', editable: true, editor: 'select', options: CONTAINER_TYPE_OPTIONS },
    { label: 'ID', value: container.id, field: 'id' },
    { label: 'Scope', value: parentSystem?.name ?? '\u2014', field: 'scope' },
    { label: 'Belongs to', value: parentSystem?.name ?? '\u2014', field: 'parent' },
    { label: 'Status', value: container.status ?? '', field: 'status', editable: true, editor: 'entity-single' },
    { label: 'External', value: '\u2014', field: 'external' },
    ...buildContainsField(children),
    { label: 'In Groups', value: '\u2014', field: 'in_groups' },
    { label: 'Diagrams', value: findDiagrams(container.id, diagrams).map((d) => d.key).join(', ') || '\u2014', field: 'diagrams' },
    { label: 'Flows', value: findFlows(container.id, flows).map((f) => f.id).join(', ') || '\u2014', field: 'flows' },
    { label: 'Tags', value: container.tags ?? [], field: 'tags', editable: true, editor: 'entity-multi' },
    { label: 'Technology', value: container.technologies ?? [], field: 'technologies', editable: true, editor: 'entity-multi' },
    { label: 'Links', value: '\u2014', field: 'links' },
    { label: 'Annotations', value: '\u2014', field: 'annotations' },
    { label: 'Description', value: container.description, field: 'description', editable: true },
  ];

  return {
    objectId: container.id,
    name: container.name,
    type: 'container',
    description: container.description,
    tags: tagValues(container.tags),
    technologies: container.technologies ?? [],
    status: container.status ?? null,
    parentId: container.parent ?? null,
    parentName: parentSystem?.name ?? null,
    scope: parentSystem?.name ?? null,
    diagrams: findDiagrams(container.id, diagrams),
    flows: findFlows(container.id, flows),
    childrenCount: children.length,
    typeLabel: 'Container',
    typeOptions: CONTAINER_TYPE_OPTIONS,
    annotations: container.annotations ?? [],
    technologyCandidates: container.scan_meta?.technology_candidates ?? [],
    fields,
    isDerived: false,
  };
}

const PERSON_TYPE_OPTIONS = [{ value: 'person', label: 'Person' }];

function buildPersonDetail(person: Person, diagrams: Diagram[], flows: Flow[]): ObjectDetail {
  const personType = person.type ?? 'person';
  const fields: DetailField[] = [
    { label: 'Name', value: person.name, field: 'name', editable: true },
    { label: 'Type', value: personType, field: 'type', editable: true, editor: 'select', options: PERSON_TYPE_OPTIONS },
    { label: 'ID', value: person.id, field: 'id' },
    { label: 'Scope', value: '\u2014', field: 'scope' },
    { label: 'Status', value: person.status ?? '', field: 'status', editable: true, editor: 'entity-single' },
    { label: 'External', value: '\u2014', field: 'external' },
    { label: 'Contains', value: '\u2014', field: 'contains' },
    { label: 'In Groups', value: '\u2014', field: 'in_groups' },
    { label: 'Diagrams', value: findDiagrams(person.id, diagrams).map((d) => d.key).join(', ') || '\u2014', field: 'diagrams' },
    { label: 'Flows', value: findFlows(person.id, flows).map((f) => f.id).join(', ') || '\u2014', field: 'flows' },
    { label: 'Tags', value: person.tags ?? [], field: 'tags', editable: true, editor: 'entity-multi' },
    { label: 'Technology', value: person.technologies ?? [], field: 'technologies', editable: true, editor: 'entity-multi' },
    { label: 'Links', value: '\u2014', field: 'links' },
    { label: 'Annotations', value: '\u2014', field: 'annotations' },
    { label: 'Description', value: person.description, field: 'description', editable: true },
  ];

  return {
    objectId: person.id,
    name: person.name,
    type: 'person',
    description: person.description,
    tags: tagValues(person.tags),
    technologies: person.technologies ?? [],
    status: person.status ?? null,
    parentId: null,
    parentName: null,
    scope: null,
    diagrams: findDiagrams(person.id, diagrams),
    flows: findFlows(person.id, flows),
    childrenCount: 0,
    typeLabel: 'Person',
    typeOptions: PERSON_TYPE_OPTIONS,
    annotations: [],
    technologyCandidates: [],
    fields,
    isDerived: false,
  };
}

const SYSTEM_TYPE_OPTIONS = [
  { value: 'system', label: 'System' },
  { value: 'store', label: 'Store' },
];

/**
 * Builds an ObjectDetail for a derived L3/L4 node (#2492).
 *
 * Derived nodes have no ``workspace.objects`` entry and no ``nodes/*.yml`` file —
 * curation runs on diagram level: the node-description is a
 * ``diagram.nodes[<id>].description`` override, the status is the Diagram status.
 * The rendered canvas node carries the display name; only the Details tab is
 * shown (no delete/annotations/history).
 */
function buildDerivedDetail(
  objectId: string,
  diagram: Diagram,
  node: DiagramNode,
): ObjectDetail {
  const isModule = diagram.type === 'module';
  const nodeEntry = diagram.nodes?.[objectId] as { description?: string } | undefined;
  const description = nodeEntry?.description ?? '';
  const name = typeof node.data?.name === 'string' ? node.data.name : objectId;

  const fields: DetailField[] = [
    { label: 'Name', value: name, field: 'name' },
    { label: 'Type', value: isModule ? 'module' : 'component', field: 'type' },
    { label: 'ID', value: objectId, field: 'id' },
    { label: 'Status', value: diagram.status ?? '', field: 'status' },
    { label: 'Description', value: description, field: 'description', editable: true },
  ];

  return {
    objectId,
    name,
    type: undefined,
    description,
    tags: [],
    technologies: [],
    status: diagram.status ?? null,
    parentId: null,
    parentName: null,
    scope: null,
    diagrams: [],
    flows: [],
    childrenCount: 0,
    annotations: [],
    technologyCandidates: [],
    typeLabel: isModule ? 'Module' : 'Component',
    typeOptions: [],
    fields,
    isDerived: true,
  };
}

function buildSystemDetail(
  sys: ArchitectureObject,
  objects: ArchitectureObject[],
  diagrams: Diagram[],
  flows: Flow[],
): ObjectDetail {
  const type = resolveType(sys);
  const children = findChildren(objects, sys.id);

  const fields: DetailField[] = [
    { label: 'Name', value: sys.name, field: 'name', editable: true },
    { label: 'Type', value: type ?? sys.type ?? '\u2014', field: 'type', editable: true, editor: 'select', options: SYSTEM_TYPE_OPTIONS },
    { label: 'ID', value: sys.id, field: 'id' },
    { label: 'Scope', value: '\u2014', field: 'scope' },
    { label: 'Status', value: sys.status ?? '', field: 'status', editable: true, editor: 'entity-single' },
    { label: 'External', value: sys.external ?? false, field: 'external', editable: true, editor: 'toggle' },
    ...buildContainsField(children),
    { label: 'In Groups', value: '\u2014', field: 'in_groups' },
    { label: 'Diagrams', value: findDiagrams(sys.id, diagrams).map((d) => d.key).join(', ') || '\u2014', field: 'diagrams' },
    { label: 'Flows', value: findFlows(sys.id, flows).map((f) => f.id).join(', ') || '\u2014', field: 'flows' },
    { label: 'Tags', value: sys.tags ?? [], field: 'tags', editable: true, editor: 'entity-multi' },
    { label: 'Technology', value: sys.technologies ?? [], field: 'technologies', editable: true, editor: 'entity-multi' },
    { label: 'Links', value: '\u2014', field: 'links' },
    { label: 'Annotations', value: '\u2014', field: 'annotations' },
    { label: 'Description', value: sys.description, field: 'description', editable: true },
  ];

  return {
    objectId: sys.id,
    name: sys.name,
    type,
    description: sys.description,
    tags: tagValues(sys.tags),
    technologies: sys.technologies ?? [],
    status: sys.status ?? null,
    parentId: null,
    parentName: null,
    scope: null,
    diagrams: findDiagrams(sys.id, diagrams),
    flows: findFlows(sys.id, flows),
    childrenCount: children.length,
    typeLabel: typeLabel(type),
    typeOptions: SYSTEM_TYPE_OPTIONS,
    annotations: sys.annotations ?? [],
    technologyCandidates: sys.scan_meta?.technology_candidates ?? [],
    fields,
    isDerived: false,
  };
}

function findDiagrams(id: string, diagrams: Diagram[]): Diagram[] {
  return diagrams.filter((d) => Object.keys(d.nodes ?? {}).includes(id));
}

function findFlows(id: string, flows: Flow[]): Flow[] {
  return flows.filter((f) => {
    return f.steps.some((s) => s.from === id || s.to === id);
  });
}

/**
 * Derives the object type exclusively from the ``type`` field (SSOT).
 * Unknown/invalid types yield ``undefined`` — a data problem, not a bucket default.
 */
function resolveType(obj: ArchitectureObject): ObjectType | undefined {
  const parsed = modelObjectTypeSchema.safeParse(obj.type);
  return parsed.success ? parsed.data : undefined;
}

// ── Derived (L3/L4) Detail ─────────────────────────────────────────────────────

function typeLabel(type: ObjectType | undefined): string {
  switch (type) {
    case 'system': return 'System';
    case 'container': return 'Container';
    case 'component': return 'Component';
    case 'person': return 'Person';
    case 'store': return 'Store';
    default: return 'Unknown';
  }
}

// ── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Hook that normalizes object metadata from the workspace for the ObjectDetailsPanel.
 *
 * Resolves the given objectId against the flat ``workspace.objects`` list
 * (Finding 1/2: systems, containers and components are all delivered
 * top-level) plus ``workspace.people``. Computes derived metadata (parent,
 * scope, diagrams via ``workspace.diagrams``, flows, flat children) and
 * returns a structured ObjectDetail with DetailField rows.
 *
 * @throws {Error} If used outside a <WorkspaceProvider>
 */
export function useObjectDetail(objectId: string | null): ObjectDetail | null {
  const { workspace } = useWorkspace();
  const { currentViewKey } = useViewState();
  const derivedDiagram = useVisceraStore((s) => s.derivedDiagram);
  const canvasNodes = useVisceraStore((s) => s.nodes);

  return useMemo(() => {
    if (!objectId || !workspace) return null;

    const objects = workspace.objects ?? [];
    const people = workspace.people ?? [];
    const diagrams = (workspace.diagrams ?? []) as Diagram[];
    const flows = workspace.flows ?? [];

    // 0. Derived L4 (module) view — curation runs on diagram level (#2492).
    //    Only L4 file nodes are a pure `modules[]` projection without a
    //    `workspace.objects` entry. L3 components ARE persisted objects
    //    (`nodes/*.yml`, type 'component', parent 'backend') and use the
    //    normal object path below — identical to L1/L2 (tags/status/
    //    technology/parent/scope/children all come from the object).
    const activeDiagram = resolveActiveDiagram(workspace, currentViewKey, derivedDiagram);
    if (activeDiagram && activeDiagram.type === 'module') {
      const renderedNode = canvasNodes.find((n) => n.id === objectId);
      if (renderedNode) {
        return buildDerivedDetail(objectId, activeDiagram, renderedNode);
      }
    }

    // 1. Flat lookup — systems, containers and components share one list
    const object = objects.find((o) => o.id === objectId);
    if (object) {
      if (object.type === 'component') {
        return buildComponentDetail(object, objects, diagrams, flows);
      }
      if (object.type === 'container' || (object.type === 'store' && object.parent)) {
        return buildContainerDetail(object, objects, diagrams, flows);
      }
      return buildSystemDetail(object, objects, diagrams, flows);
    }

    // 2. Try to find as a person
    const person = people.find((p) => p.id === objectId);
    if (person) {
      return buildPersonDetail(person, diagrams, flows);
    }

    return null;
  }, [objectId, workspace, currentViewKey, derivedDiagram, canvasNodes]);
}
