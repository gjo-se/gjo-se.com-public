import type { Diagram, ViewLayout, ViewType, Workspace } from './workspaceSchema';

/**
 * Derived (ephemeral) diagram lifecycle helpers for the lazy drill-down (#2491).
 *
 * L3/L4 views open derived on-the-fly — reines Ansehen erzeugt KEINE
 * `diagrams/*.yml`-Datei. Erst die erste Kurations-Aktion materialisiert das
 * Diagramm über den regulären `create_diagram`-Sync-Pfad; danach ist die
 * Auflösung ein persistiertes Diagramm (Resolver-Reihenfolge: persisted gewinnt).
 */

export type DerivedDiagramLevel = 'component' | 'module';

const LEVEL_SUFFIX: Record<DerivedDiagramLevel, { key: string; label: string }> = {
  component: { key: 'components', label: 'Components' },
  module: { key: 'modules', label: 'Modules' },
};

/**
 * Baut das ephemeren Diagramm für eine derived View — NUR im Store
 * (`navigationSlice.derivedDiagram`), NIEMALS in `workspace.diagrams`.
 */
export function buildDerivedDiagram(parentId: string, level: DerivedDiagramLevel): Diagram {
  const suffix = LEVEL_SUFFIX[level];
  return {
    key: buildDerivedDiagramKey(parentId, level),
    name: `${parentId} ${suffix.label}`,
    type: level as ViewType,
    description: '',
    parent: parentId,
    source: 'code',
    base: null,
    layout: 'lr' as ViewLayout,
    nodes: {},
    status: 'pending',
    scan_meta: null,
  };
}

/**
 * Deterministischer derived-Key: `{parentId}-{components|modules}` (z. B.
 * `backend-components`, `app.core.llm-modules`). Identisches Schema wie der
 * frühere Scanner-Key, damit eine später materialisierte Datei und die derived
 * View denselben Key tragen (stabile URLs).
 */
export function buildDerivedDiagramKey(parentId: string, level: DerivedDiagramLevel): string {
  return `${parentId}-${LEVEL_SUFFIX[level].key}`;
}

/**
 * Einziger Resolver für alle Diagram-Lookups. Persisted gewinnt: existiert ein
 * `workspace.diagrams`-Eintrag mit dem Key, ist es ein reguläres Diagramm (kein
 * ephemerer State). Nur wenn keins existiert, wird das ephemere `derivedDiagram`
 * zurückgegeben (wenn sein Key matcht).
 */
export function resolveActiveDiagram(
  workspace: Workspace | null,
  viewKey: string,
  derivedDiagram: Diagram | null,
): Diagram | undefined {
  const persisted = (workspace?.diagrams ?? []).find((d: Diagram) => d.key === viewKey);
  if (persisted) return persisted;
  if (derivedDiagram?.key === viewKey) return derivedDiagram;
  return undefined;
}
