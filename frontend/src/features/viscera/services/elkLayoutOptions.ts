// ── ELK Layout Options ───────────────────────────────────────────────────────

/** ELK layered layout options for SystemContext diagrams. */
export const LANDSCAPE_LAYOUT_OPTIONS: Record<string, string> = {
  'elk.algorithm': 'layered',
  // Bottom-up: Ebenen von unten nach oben? Nein – Richtung DOWN: Sources
  // (Personen/Rollen) oben, System darunter, externe Systeme unten.
  'elk.direction': 'DOWN',
  // Spacing
  'elk.layered.spacing.nodeNodeBetweenLayers': '140',
  'elk.spacing.nodeNode': '90',
  'elk.layered.spacing.edgeNodeBetweenLayers': '20',
  'elk.spacing.edgeNode': '20',
  // Edge routing: spline curves (no straight lines crossing cards)
  'elk.edgeRouting': 'SPLINES',
  // Model order: respect YAML ordering (people first, systems after)
  'elk.layered.considerModelOrder.strategy': 'NODES_AND_EDGES',
  'elk.layered.crossingMinimization.forceNodeModelOrder': 'true',
  // Merge parallel edges (e.g. homepage → all systems)
  'elk.layered.mergeEdges': 'true',
  'elk.layered.mergeHierarchyEdges': 'true',
  // High-degree nodes: tree-routing instead of star (homepage 28 edges)
  'elk.layered.highDegreeNodes.treatment': 'true',
  'elk.layered.highDegreeNodes.threshold': '8',
  // Node placement: favor straight edges for vertical chains
  'elk.layered.nodePlacement.strategy': 'BRANDES_KOEPF',
  'elk.layered.nodePlacement.favorStraightEdges': 'true',
  // Feedback edges: handle bidirectional edges (Backend↔Restate)
  'elk.layered.feedbackEdges': 'true',
  // Edge labels centered
  'elk.layered.edgeLabels.placement': 'CENTER',
  // Layer assignment strategy
  'elk.layered.layering.strategy': 'NETWORK_SIMPLEX',
  // Priority direction: high-priority nodes first (internal systems = central)
  'elk.layered.priority.direction': 'FIRST',
};

/** ELK layout options for flat level views (Container L2, Component L3). */
export const FLAT_LAYOUT_OPTIONS: Record<string, string> = {
  'elk.algorithm': 'layered',
  'elk.direction': 'RIGHT',
  'elk.layered.spacing.nodeNodeBetweenLayers': '120',
  'elk.spacing.nodeNode': '70',
  'elk.layered.spacing.edgeNodeBetweenLayers': '15',
  'elk.spacing.edgeNode': '15',
  'elk.edgeRouting': 'SPLINES',
  'elk.layered.considerModelOrder.strategy': 'NODES_AND_EDGES',
  'elk.layered.mergeEdges': 'true',
  'elk.layered.highDegreeNodes.treatment': 'true',
  'elk.layered.nodePlacement.strategy': 'BRANDES_KOEPF',
  'elk.layered.nodePlacement.favorStraightEdges': 'true',
  'elk.layered.feedbackEdges': 'true',
  'elk.layered.edgeLabels.placement': 'CENTER',
  'elk.layered.layering.strategy': 'NETWORK_SIMPLEX',
  // Priority direction: high-priority nodes first (internal nodes = central)
  'elk.layered.priority.direction': 'FIRST',
};

// ── Grid Snap ────────────────────────────────────────────────────────────────

const GRID = 20;
export const snap = (n: number): number => Math.round(n / GRID) * GRID;
