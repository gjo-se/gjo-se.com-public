/**
 * Viscera – Card-Kind Registry
 *
 * Mapping `object.type` → `CardKind` und `CardKind` → ReactFlow-Node-Typ als
 * reine Daten. Getrennt von den Level-Definitionen (`levelRegistry`), da die
 * Card-Wahl ausschließlich von `object.type` abhängt und keine Level-Eigenschaft
 * ist.
 */

import type { ModelObjectType } from './workspaceSchema';

// ── Card-Kind Mapping ─────────────────────────────────────────────────────────

export type CardKind =
  | 'system'
  | 'person'
  | 'container'
  | 'component'
  | 'store'
  | 'table';

const TYPE_CARD_KINDS: Record<ModelObjectType, CardKind> = {
  system: 'system',
  person: 'person',
  container: 'container',
  component: 'component',
  store: 'store',
  table: 'table',
};

/**
 * `systemCard`/`personCard`/`containerCard` mappen alle auf `CardNode`
 * (siehe `viewer/utils/nodeEdgeTypes.ts`) – die Zuordnung `store → containerCard`
 * ist verhaltensneutral (Cylinder-Shape kommt aus `CardKind`, nicht aus dem Node-Typ).
 */
export const NODE_TYPE_BY_KIND: Record<
  CardKind | 'group',
  'systemCard' | 'personCard' | 'containerCard' | 'sqlTableCard' | 'group'
> = {
  system: 'systemCard',
  person: 'personCard',
  container: 'containerCard',
  component: 'containerCard',
  store: 'containerCard',
  table: 'sqlTableCard',
  group: 'group',
};

// ── Access Helpers ────────────────────────────────────────────────────────────

/**
 * Resolves the CardKind for an object type.
 * `'system'` is the canonical default for typeless legacy objects
 * (no structural fallback like the old `resolveCardKind`).
 */
export function getCardKind(type: string | undefined): CardKind {
  return isModelObjectType(type) ? TYPE_CARD_KINDS[type] : 'system';
}

function isModelObjectType(type: string | undefined): type is ModelObjectType {
  return type !== undefined && type in TYPE_CARD_KINDS;
}
