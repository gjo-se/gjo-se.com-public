import { SigmaContainer } from '@react-sigma/core';
import { cva } from 'class-variance-authority';
import Graph from 'graphology';
import { useMemo } from 'react';

import Button from '@src/components/primitives/Button/Button';
import Text from '@src/components/primitives/Text/Text';

import type { ImportModule } from '../../../core/modulesSchema';

const centeredVariants = cva('flex h-full items-center justify-center bg-white dark:bg-gray-950');
const errorStateVariants = cva(
  'flex h-full flex-col items-center justify-center gap-4 bg-white dark:bg-gray-950',
);
const errorMessageVariants = cva('max-w-lg text-center font-mono text-red-600');
const graphContainerVariants = cva('h-full w-full bg-white dark:bg-gray-950');

// ── Props ────────────────────────────────────────────────────────────────────

export interface ModuleSigmaViewProps {
  /** L4-Module aus dem Store – ein Datenbestand, zwei Projektionen (Sicht A/B). */
  modules: ImportModule[];
  loading: boolean;
  error: string | null;
  onReload?: () => void;
}

// ── Graph Builder ────────────────────────────────────────────────────────────

/**
 * Baut den graphology-Graph aus `modules[]` (ein Datenbestand, zwei Projektionen):
 * - Knoten = Datei-Modul (Label = letztes Segment des Modulnamens)
 * - Kanten = Imports – nur wenn das Import-Ziel als Node existiert (visible-endpoint)
 * - Edge-Dedup über den `${from}__${to}`-Key (Konvention `buildDiagramEdgeModels`)
 * - Statisches Circular-Layout: x/y-Koordinaten auf dem Kreis (kein Layout-Paket nötig)
 */
function buildModuleGraph(modules: ImportModule[]): Graph {
  const graph = new Graph();

  modules.forEach((m) => {
    if (!graph.hasNode(m.name)) {
      graph.addNode(m.name, {
        label: m.name.split('.').at(-1) ?? m.name,
        path: m.path,
        size: 3,
      });
    }
  });

  // Statisches Circular-Layout – Radius skaliert mit der Node-Anzahl.
  const names = modules.map((m) => m.name);
  const radius = Math.max(200, Math.sqrt(names.length) * 50);
  names.forEach((name, i) => {
    const angle = (i / names.length) * 2 * Math.PI;
    graph.setNodeAttribute(name, 'x', radius * Math.cos(angle));
    graph.setNodeAttribute(name, 'y', radius * Math.sin(angle));
  });

  const seen = new Set<string>();
  modules.forEach((m) => {
    m.imports.forEach((imp) => {
      // Nur sichtbare Endpoints (analog visible-endpoint-Filter aus Sicht A).
      if (!graph.hasNode(imp)) return;
      const edgeKey = `${m.name}__${imp}`;
      if (seen.has(edgeKey)) return;
      seen.add(edgeKey);
      graph.addEdge(m.name, imp, { type: 'arrow' });
    });
  });

  return graph;
}

// ── Component ────────────────────────────────────────────────────────────────

/** Sicht B (L4-Sigma): WebGL-Gesamtnetz über `@react-sigma` + `graphology`. */
export default function ModuleSigmaView({ modules, loading, error, onReload }: ModuleSigmaViewProps) {
  const graph = useMemo(() => buildModuleGraph(modules), [modules]);

  if (loading) {
    return (
      <div className={centeredVariants()}>
        <Text color="muted">Loading modules…</Text>
      </div>
    );
  }

  if (error) {
    return (
      <div className={errorStateVariants()}>
        <Text color="muted" size="sm">Fehler beim Laden der Module:</Text>
        <div className={errorMessageVariants()}>
          <Text color="inherit" size="sm">
            {error}
          </Text>
        </div>
        {onReload && (
          <Button variant="outline" size="sm" onClick={onReload}>
            Erneut laden
          </Button>
        )}
      </div>
    );
  }

  if (modules.length === 0) {
    return (
      <div className={centeredVariants()}>
        <Text color="muted">
          Keine Module für die aktive Sicht
        </Text>
      </div>
    );
  }

  return (
    <div className={graphContainerVariants()}>
      <SigmaContainer
        graph={graph}
        style={{ width: '100%', height: '100%' }}
        settings={{
          renderEdgeLabels: false,
          defaultEdgeType: 'arrow',
          defaultNodeColor: '#9ca3af',
        }}
      />
    </div>
  );
}
