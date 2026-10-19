/**
 * Viscera – Zod Schemas
 *
 * Definiert die vollständige YAML-Datenstruktur als SSOT.
 * Validiert C4-Regeln + eigene Konventionen für Viscera (Epic #188).
 */

import { z } from 'zod';

// ── V2 Base Types ────────────────────────────────────────────────────────────

export const modelObjectTypeSchema = z.enum([
  'system',
  'container',
  'component',
  'store',
  'person',
  'table',
]);

export type ModelObjectType = z.infer<typeof modelObjectTypeSchema>;

/**
 * Database column on a `table` object – karten-relevante Felder aus INC 2 (#2504).
 * Defaults/Indizes/Comments sind bewusst NICHT Teil der Karte.
 */
const tableColumnSchema = z.object({
  name: z.string(),
  type: z.string().optional(),
  nullable: z.boolean().optional(),
  pk: z.boolean().optional(),
  fk: z.boolean().optional(),
});

export type TableColumn = z.infer<typeof tableColumnSchema>;

export const annotationSchema = z.object({
  text: z.string(),
  author: z.string(),
  date: z.string(),
});

export type Annotation = z.infer<typeof annotationSchema>;

/**
 * Returns tag slugs for display/search consumers.
 * With slug-based tags (string[]), this is a trivial pass-through.
 */
export function tagValues(tags: string[] | undefined): string[] {
  return tags ?? [];
}

// ── View Layout ─────────────────────────────────────────────────────────────

export const viewLayoutSchema = z.enum(['lr', 'tb', 'bt', 'rl']);

export type ViewLayout = z.infer<typeof viewLayoutSchema>;

// ── View Type ───────────────────────────────────────────────────────────────

export const viewTypeSchema = z.enum([
  'systemContext',
  'container',
  'component',
  'module',
  'dataModel',
]);

export type ViewType = z.infer<typeof viewTypeSchema>;

// ── Step Type ───────────────────────────────────────────────────────────────

export const stepTypeSchema = z.enum(['message', 'process', 'decision']);

export type StepType = z.infer<typeof stepTypeSchema>;

// ── Flow Spec ───────────────────────────────────────────────────────────────

export const flowSpecSchema = z.object({
  given: z.string(),
  when: z.string(),
  then: z.string(),
});

export type FlowSpec = z.infer<typeof flowSpecSchema>;

// ── Style ───────────────────────────────────────────────────────────────────

export const styleSchema = z.object({
  element: z.string(),
  background: z.string().optional(),
  color: z.string().optional(),
  stroke: z.string().optional(),
  shape: z.string().optional(),
  fontSize: z.number().optional(),
});

export type Style = z.infer<typeof styleSchema>;

// ── Layout Map / Diagram ─────────────────────────────────────────────────────

export const layoutMapSchema = z.record(
  z.string(),
  z.object({
    x: z.number(),
    y: z.number(),
    width: z.number(),
    height: z.number(),
  }),
);

/**
 * Derived type representing a navigable child diagram for a parent system.
 * Computed from Diagram definitions, not from inline containers/components.
 */
export interface ChildDiagram {
  key: string;
  name: string;
  parentId: string;
  /** C4 level of the child diagram (module = L4-Modul-Ebene einer Component, dataModel = ER-Modell). */
  level: 'container' | 'component' | 'module' | 'dataModel';
  description?: string;
  /** Whether this is the default child diagram for the parent. */
  isDefault: boolean;
}

/** Diagram loaded from the API — individual files under architecture/diagrams/. */
export interface Diagram {
  key: string;
  name: string;
  type: ViewType;
  description: string;
  parent: string | null;
  /** Source origin (see `DiagramSource`). Default `'code'` – missing field normalizes on load. */
  source: DiagramSource;
  /** Database base (ER-Membership, INC 4): core | gjo_se_com. Null for non-ER diagrams. */
  base: string | null;
  layout: ViewLayout | null;
  /**
   * Node positions + group bounds persisted in the diagram YAML:
   * {nodeId: {x, y, width?, height?, description?}, ...}.
   * `description` is a derived (L3/L4) node-description override (#2492, BE #2467).
   */
  nodes: Record<
    string,
    { x: number; y: number; width?: number; height?: number; description?: string }
  >;
  /** Lifecycle status (viscera-* Slug, Default viscera-approved):
   * approved, pending, planned, scan_missing, deprecated, rejected. */
  status: string;
  /** Scan metadata — null for user-created diagrams (immune to re-scan). */
  scan_meta: Record<string, unknown> | null;
}

/** Source origin of a Diagram – `code` = hand-maintained/declarative, `golden` = Golden-Diagram (BE-generated). */
export type DiagramSource = 'code' | 'golden';

export type LayoutMap = z.infer<typeof layoutMapSchema>;

// ── Edge ────────────────────────────────────────────────────────────────────

export const edgeSchema = z.object({
  from: z.string(),
  to: z.string(),
  description: z.string().nullable().optional(),
  technology: z.string().nullable().optional(),
  tags: z.array(z.string()).nullable().optional(),
  scan_meta: z.unknown().nullable().optional(),
  status: z.string().nullable().optional(),
});

export type Edge = z.infer<typeof edgeSchema>;

// ── Flow Step ───────────────────────────────────────────────────────────────

export const flowStepSchema = z.object({
  id: z.string(),
  type: stepTypeSchema,
  from: z.string().optional(),
  to: z.string().optional(),
  label: z.string().optional(),
  visual: z.unknown().optional(),
  spec: flowSpecSchema.optional(),
});

export type FlowStep = z.infer<typeof flowStepSchema>;

// ── Flow ────────────────────────────────────────────────────────────────────

export const flowSchema = z.object({
  id: z.string(),
  title: z.string(),
  steps: z.array(flowStepSchema),
  description: z.string().optional(),
  tags: z.array(z.string()).optional(),
  flowParentIds: z.array(z.string()).optional().default([]),
});

export type Flow = z.infer<typeof flowSchema>;

// ── ADR (Architecture Decision Record) ──────────────────────────────────────

export const adrStatusSchema = z.enum([
  'proposed',
  'accepted',
  'deprecated',
  'superseded',
  'draft',
]);

export type AdrStatus = z.infer<typeof adrStatusSchema>;

export const adrFrontmatterSchema = z.object({
  id: z.union([z.number(), z.string()]),
  title: z.string(),
  status: adrStatusSchema,
  date: z.string(),
  systems: z.array(z.string()).optional().default([]),
  diagrams: z.array(z.string()).optional().default([]),
  tags: z.array(z.string()).optional().default([]),
});

export type AdrFrontmatter = z.infer<typeof adrFrontmatterSchema>;

// ── Group ───────────────────────────────────────────────────────────────────

/** Group entity loaded from the API — individual files under architecture/groups/ (Finding 9). */
const groupSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional().default(''),
  members: z.array(z.string()).optional().default([]),
});

export type Group = z.infer<typeof groupSchema>;

// ── Scan Meta ────────────────────────────────────────────────────────────────

/** Technology suggestion from the scanner — catalog slug, not a direct assignment. */
const technologyCandidateSchema = z.object({
  slug: z.string(),
  name: z.string(),
  source: z.string().optional(),
});

export type TechnologyCandidate = z.infer<typeof technologyCandidateSchema>;

/** Metadata from the last scan run — UI hints and source tracking. */
const scanMetaSchema = z.object({
  technology_candidates: z.array(technologyCandidateSchema).optional(),
  last_scan_at: z.string().optional(),
});

// ── Workspace (Root) ────────────────────────────────────────────────────────

/**
 * Single Zod object family for all workspace objects (systems, people,
 * containers, components, stores). `type` discriminates the object kind;
 * systems without `type` stay valid (flat node-file reality).
 */
export const objectSchema = z.object({
  id: z.string(),
  name: z.string(),
  // Optional with '' default: node YAML files may omit the field
  // (legacy/scanner-written files, canvas quick-add path).
  description: z.string().optional().default(''),
  // BE persistiert `data_store`, FE-Kanon ist `store` – Normalisierung an genau
  // einer Stelle (SSOT), damit alle Konsumenten kanonische `store`-Werte sehen.
  type: z.preprocess(
    (value) => (value === 'data_store' ? 'store' : value),
    modelObjectTypeSchema,
  ).optional(),
  status: z.string().optional(),
  technology: z.string().optional(),
  technologies: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  parent: z.string().optional(),
  external: z.boolean().optional().default(false),
  scan_meta: scanMetaSchema.nullable().optional(),
  annotations: z.array(annotationSchema).optional(),
  contains: z.array(z.string()).optional(),
  d2: z.string().optional(),
  stately: z.string().optional(),
  /** Karten-relevante Spalten einer `table`-Node (INC 2, #2504). */
  columns: z.array(tableColumnSchema).optional(),
});

export type ArchitectureObject = z.infer<typeof objectSchema>;

/** Person object — same single family, discriminated via `type: 'person'`. */
export type Person = z.infer<typeof objectSchema>;

/** System object — same single family, discriminated via `type`/absence of it. */
export type System = z.infer<typeof objectSchema>;

export const workspaceSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  people: z.array(objectSchema).optional().default([]),
  objects: z.array(objectSchema).optional().default([]),
  /** Diagrams loaded from API — the single diagram source of the workspace. */
  diagrams: z.array(z.any()).optional().default([]),
  /** Groups loaded from API — own entity (Finding 9), supersedes type: 'group' objects. */
  groups: z.array(groupSchema).optional().default([]),
  edges: z.array(edgeSchema).optional().default([]),
  flows: z.array(flowSchema).optional().default([]),
  styles: z.array(styleSchema).optional().default([]),
});

export type Workspace = z.infer<typeof workspaceSchema>;
