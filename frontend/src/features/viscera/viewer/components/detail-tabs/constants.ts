// ── Tab Configuration ─────────────────────────────────────────────────────────

export type TabKey = 'details' | 'edges' | 'history' | 'annotations';

export const TABS: { key: TabKey; label: string }[] = [
  { key: 'details', label: 'Details' },
  { key: 'edges', label: 'Edges' },
  { key: 'history', label: 'History' },
  { key: 'annotations', label: 'Annotations' },
];

/**
 * Reduced tab set for derived (L3/L4) nodes (#2492) — only the Details tab
 * (node-description + diagram status). No edges/history/annotations for derived.
 */
export const DERIVED_TABS: { key: TabKey; label: string }[] = [
  { key: 'details', label: 'Details' },
];

// ── Visual Tokens ────────────────────────────────────────────────────────────

export const BADGE_BG_MAP: Record<string, string> = {
  System: '#e94560',
  Container: '#1a1a2e',
  Component: '#f59e0b',
  Person: '#2563eb',
  Store: '#7c3aed',
  Module: '#0ea5e9',
  Group: '#059669',
};

export const HEADER_CLASS =
  'flex items-start justify-between py-3 border-b border-gray-100 dark:border-gray-800';

// ── Timing ───────────────────────────────────────────────────────────────────

export const COPY_FEEDBACK_MS = 2000;
