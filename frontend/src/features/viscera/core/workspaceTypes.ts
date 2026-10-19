/**
 * Viscera – TypeScript Types
 *
 * Alle Typen via z.infer<> aus den Zod-Schemas abgeleitet.
 * SSOT: workspace.schema.ts
 */

import type {
  AdrFrontmatter,
  AdrStatus,
  Annotation,
  ArchitectureObject,
  ChildDiagram,
  Diagram,
  Flow,
  FlowSpec,
  FlowStep,
  LayoutMap,
  ModelObjectType,
  Person,
  Edge,
  StepType,
  Style,
  System,
  ViewLayout,
  ViewType,
  Workspace,
} from './workspaceSchema';

export type {
  AdrFrontmatter,
  AdrStatus,
  Annotation,
  ArchitectureObject,
  ChildDiagram,
  Diagram,
  Flow,
  FlowSpec,
  FlowStep,
  LayoutMap,
  ModelObjectType,
  Person,
  Edge,
  StepType,
  Style,
  System,
  ViewLayout,
  ViewType,
  Workspace,
};

// ── Convenience Types ───────────────────────────────────────────────────────

/** Einzelne YAML-Datei (z.B. eine System-YAML-Datei) als Partial des Workspace */
export type WorkspaceFile = Partial<Workspace> & Pick<Workspace, 'id'>;
