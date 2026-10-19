/**
 * Layout constants + injected CSS for the ProjectComparisonTable organism.
 */
import type { CSSProperties } from 'react';

export const LABEL_W = 130;
export const COL_MIN_W = 160;
export const COL_MAX_W = 200;

/** Sticky style of the leading label column. */
export const stickyLabel: CSSProperties = {
  position: 'sticky',
  left: 0,
  zIndex: 20,
  minWidth: LABEL_W,
  maxWidth: LABEL_W,
};

/** Sticky style of the canonical (master) column. */
export const stickyCanonical: CSSProperties = {
  position: 'sticky',
  left: LABEL_W,
  zIndex: 10,
  minWidth: COL_MIN_W,
  maxWidth: COL_MAX_W,
  overflow: 'hidden',
};

/** Style of a regular (scrolling) data column. */
export const dataCol: CSSProperties = {
  minWidth: COL_MIN_W,
  maxWidth: COL_MAX_W,
  overflow: 'hidden',
};

/** Scoped CSS for the comparison table (sticky cells, combobox popups). */
export const PCT_STYLES = `
  .pct-wrapper td:first-child,
  .pct-wrapper th:first-child {
    background-color: var(--color-white);
    transition: background-color 150ms;
  }
  .pct-wrapper td:nth-child(2),
  .pct-wrapper th:nth-child(2) {
    background-color: var(--color-white);
    transition: background-color 150ms;
  }
  .dark .pct-wrapper td:first-child,
  .dark .pct-wrapper th:first-child {
    background-color: var(--color-gray-900);
  }
  .dark .pct-wrapper td:nth-child(2),
  .dark .pct-wrapper th:nth-child(2) {
    background-color: var(--color-gray-900);
  }

  .pct-wrapper tr:hover td:first-child,
  .pct-wrapper tr:hover th:first-child {
    background-color: var(--color-gray-50);
  }
  .pct-wrapper tr:hover td:nth-child(2),
  .pct-wrapper tr:hover th:nth-child(2) {
    background-color: var(--color-gray-50);
  }
  .dark .pct-wrapper tr:hover td:first-child,
  .dark .pct-wrapper tr:hover th:first-child {
    background-color: rgba(31, 41, 55, 0.5);
  }
  .dark .pct-wrapper tr:hover td:nth-child(2),
  .dark .pct-wrapper tr:hover th:nth-child(2) {
    background-color: rgba(31, 41, 55, 0.5);
  }

  /* Constrain combobox popups to column width and raise above sticky cells */
  [data-slot="combobox-content"] {
    max-width: 280px !important;
    position: relative;
    z-index: 60;
  }
  /* Positioner parent also needs z-index (popup in Portal, behind sticky cells) */
  div:has(> [data-slot="combobox-content"]) {
    z-index: 60 !important;
  }
  .pct-wrapper [data-slot="combobox-trigger"] {
    width: 100%;
    justify-content: space-between;
  }
  /* Combobox popup: match table background in dark mode */
  .dark [data-slot="combobox-content"] {
    background-color: var(--color-gray-900);
  }
  /* Table-row separator between combobox items */
  [data-slot="combobox-item"] {
    border-bottom: 1px solid var(--color-border);
    border-radius: 0;
  }
  [data-slot="combobox-item"]:last-child {
    border-bottom: none;
  }
  /* Force sticky cells to clip content from scrolling columns */
  .pct-wrapper td[style*="position: sticky"] {
    box-shadow: 2px 0 4px rgba(0,0,0,0.05);
  }
  .dark .pct-wrapper td[style*="position: sticky"] {
    box-shadow: 2px 0 4px rgba(0,0,0,0.3);
  }
`;
