/**
 * useFileTraceability – Ermittelt alle zugehörigen Dateien für ein Element.
 *
 * Baut File-Links aus YAML-Quelle, D2-Diagrammen und ADRs.
 * Pure derivation (keine Seiteneffekte, keine API-Calls).
 */

import { useMemo } from 'react';

import type { Adr } from '../services/adrFileService';

// ── Types ─────────────────────────────────────────────────────────────────

export interface FileLink {
  label: string;
  path: string;
  type: 'yaml' | 'd2-svg' | 'd2-source' | 'adr' | 'layout';
}

export interface UseFileTraceabilityOptions {
  elementType: 'system' | 'container' | 'person';
  /** The system's or container's d2 field (e.g. "backend-container"). */
  d2?: string;
  /**
   * Parent system ID for containers.
   * Derived from elementId (split on first '.') if not provided.
   */
  parentSystemId?: string;
  /** ADR decisions that reference this element via frontmatter.systems. */
  decisions?: Adr[];
}

// ── Hook ──────────────────────────────────────────────────────────────────

/**
 * Hook: Ermittelt alle zugehörigen Dateien für ein gegebenes Element.
 *
 * Baut FileLink-Array aus:
 *   - YAML-Quelle (architecture/nodes/<id>.yml)
 *   - D2-SVG (architecture/diagrams/rendered/<d2>.d2.svg)
 *   - D2-Source (architecture/diagrams/src/<d2>.d2)
 *   - ADRs (via decisions-Prop)
 */
export function useFileTraceability(
  elementId: string,
  options: UseFileTraceabilityOptions,
): FileLink[] {
  const { elementType, d2, parentSystemId, decisions } = options;

  return useMemo(() => {
    const files: FileLink[] = [];

    // YAML-Quelle
    if (elementType === 'system' || elementType === 'person') {
      files.push({
        label: `${elementId}.yml`,
        path: `architecture/nodes/${elementId}.yml`,
        type: 'yaml',
      });
    } else {
      const sysId = parentSystemId ?? elementId.split('.')[0] ?? elementId;
      files.push({
        label: `${sysId}.yml`,
        path: `architecture/nodes/${sysId}.yml`,
        type: 'yaml',
      });
    }

    // D2-SVG + D2-Source (nur wenn d2-Feld gesetzt)
    if (d2) {
      files.push({
        label: `${d2}.d2.svg`,
        path: `architecture/diagrams/rendered/${d2}.d2.svg`,
        type: 'd2-svg',
      });
      files.push({
        label: `${d2}.d2`,
        path: `architecture/diagrams/src/${d2}.d2`,
        type: 'd2-source',
      });
    }

    // ADRs
    if (decisions) {
      decisions.forEach((adr) => {
        const filename = adr.filePath.split('/').pop() ?? adr.filePath;
        files.push({
          label: filename,
          path: adr.filePath,
          type: 'adr',
        });
      });
    }

    return files;
  }, [elementId, elementType, d2, parentSystemId, decisions]);
}
