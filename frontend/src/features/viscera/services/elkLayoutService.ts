import { resolveActiveDiagram } from '../core/derivedDiagram';
import { DIAGRAM_LEVELS } from '../core/levelRegistry';

import { buildFlatGraph, buildSystemContextGraph } from './elkAdapter';
import { buildModuleGraph } from './elkModulesAdapter';
import { toNodePositions } from './elkPositionMerge';

import type { LayoutPosition, LayoutRequest, LayoutResponse } from './elkAdapter';

// ── Public API ─────────────────────────────────────────────────────────────

// Barrel: Types live in elkAdapter (single source), re-exported for consumers.
export type { LayoutRequest, LayoutResponse, NodePosition } from './elkAdapter';

/**
 * Pure async function: computes ELK.js layout for the given workspace + viewKey.
 *
 * Phase 1: ELK auto-layout (async) – resolves the diagram's registry level
 * (`core/levelRegistry`) and dispatches on its layout strategy/dataSource:
 * `hierarchicalGroups` → L1, `dataSource 'modules'` (nur L4) → Modul-Graph,
 * sonst (`'objects'`, L1–L3 + dataModel) → `buildFlatGraph`.
 * Phase 2: Override application + NodePosition conversion (sync).
 *
 * Replaces the deprecated `useLayout` hook.
 */
export async function computeLayout(req: LayoutRequest): Promise<LayoutResponse> {
  const { workspace, viewKey, overrides } = req;
  const start = performance.now();

  // Ein Resolver für alle Diagram-Lookups — persisted gewinnt, sonst ephemeres
  // derived-Diagramm (lazy L4, #2491). Kein dritter Lookup-Pfad.
  const diagram = resolveActiveDiagram(workspace, viewKey, req.derivedDiagram ?? null);
  const level = diagram
    ? DIAGRAM_LEVELS.find((def) => def.diagramType === diagram.type)
    : undefined;

  let elkPositions: Map<string, LayoutPosition>;
  if (!level) {
    // No Diagram matches this key or its type has no registry entry –
    // nothing to lay out (no silent system default, no throw in the render path).
    elkPositions = new Map();
  } else if (level.layoutStrategy === 'hierarchicalGroups') {
    elkPositions = await buildSystemContextGraph(workspace);
  } else if (level.dataSource === 'modules') {
    // Nur L4 (module) – L3 components sind objects-basiert und laufen über
    // buildFlatGraph (Registry dataSource 'objects').
    elkPositions = await buildModuleGraph(workspace, diagram!, req.modules ?? []);
  } else {
    elkPositions = await buildFlatGraph(workspace, diagram!, level);
  }

  const positions = toNodePositions(elkPositions, overrides);
  const durationMs = Math.round(performance.now() - start);

  return { positions, durationMs, wasInitial: req.nodesEmpty };
}
