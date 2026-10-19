/**
 * Viscera – Level Registry
 *
 * Einzige Quelle der Level-Wahrheit (L1–L4) als reine Daten – kein Verhalten.
 * Card-Wahl hängt ausschließlich von `object.type` ab; `CardKind` ist keine Level-Eigenschaft.
 */

import type { ModelObjectType, ViewType } from './workspaceSchema';

// ── Level Contract ────────────────────────────────────────────────────────────

export interface DiagramLevelDefinition {
  diagramType: ViewType;
  scopedTypes: ModelObjectType[];
  includePeople: 'always' | 'connected';
  grouping: 'groups' | 'none';
  layoutStrategy: LayoutStrategy;
  edgeResolution: EdgeResolution;
  levelLabel: string;
  /**
   * Datenquelle der Nodes/Edges. `'objects'` = kuratierte Architektur-Objekte
   * aus `workspace.objects` (L1/L2/L3/dataModel); `'modules'` = derived
   * Projektion aus `modules[]` (nur L4 – Module sind keine `nodes/*`-Objekte).
   * L3 components sind seit der Objekt-Persistenz (Scanner schreibt
   * ``nodes/*.yml`` mit ``type=component``) ebenfalls `'objects'`-basiert und
   * durchlaufen exakt denselben Render-Pfad wie L1/L2.
   */
  dataSource: 'objects' | 'modules';
}

type EdgeResolution = 'systemLevel' | 'direct';

type LayoutStrategy = 'hierarchicalGroups' | 'flat' | 'modules';

/**
 * Level-Definitionen L1–L4 – Reihenfolge im Array = C4-Reihenfolge.
 * Registry ist die einzige Level-Quelle im Rendering-Pfad
 * (inkl. Dropdown-Labels + Reihenfolge, #2404).
 * `container`-Level scoped `store` = kanonischer FE-Name für BE `data_store`
 * (Normalisierung folgt).
 */
export const DIAGRAM_LEVELS: DiagramLevelDefinition[] = [
  {
    diagramType: 'systemContext',
    scopedTypes: ['system'],
    includePeople: 'always',
    grouping: 'groups',
    layoutStrategy: 'hierarchicalGroups',
    edgeResolution: 'systemLevel',
    levelLabel: 'Context',
    dataSource: 'objects',
  },
  {
    diagramType: 'container',
    scopedTypes: ['container', 'store'],
    includePeople: 'connected',
    grouping: 'none',
    layoutStrategy: 'flat',
    edgeResolution: 'direct',
    levelLabel: 'App',
    dataSource: 'objects',
  },
  {
    diagramType: 'component',
    scopedTypes: ['component'],
    includePeople: 'connected',
    grouping: 'none',
    layoutStrategy: 'flat',
    edgeResolution: 'direct',
    levelLabel: 'Component',
    dataSource: 'objects',
  },
  {
    diagramType: 'module',
    scopedTypes: [],          // L4 scopt keine workspace-Objekte – Membership aus modules[]
    includePeople: 'connected', // ergibt leer: keine scoped Objekte → keine connected people
    grouping: 'none',
    layoutStrategy: 'modules',
    edgeResolution: 'direct',
    levelLabel: 'Module',
    dataSource: 'modules',
  },
  {
    diagramType: 'dataModel',
    scopedTypes: ['table'],
    includePeople: 'connected', // ergibt leer: keine Person ist mit einer Tabelle verbunden
    grouping: 'none',
    layoutStrategy: 'flat',
    edgeResolution: 'direct',
    levelLabel: 'DB',
    dataSource: 'objects',
  },
];

// ── Access Helpers ────────────────────────────────────────────────────────────

/**
 * Returns the level definition for a diagramType.
 * Throws on unknown diagramType – explicitly no silent fallback.
 */
export function getDiagramLevel(diagramType: ViewType): DiagramLevelDefinition {
  const level = DIAGRAM_LEVELS.find((def) => def.diagramType === diagramType);
  if (!level) {
    throw new Error(`Unknown diagramType '${diagramType}' – not covered by DIAGRAM_LEVELS`);
  }
  return level;
}
