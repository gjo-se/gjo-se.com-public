/**
 * Shared card/group dimensions — single home for node dimension constants.
 *
 * Moved from `hooks/useDiagramNodes.ts` (Epic #188, Inc 6): `CARD`,
 * `GROUP_MIN` and `GROUP_PADDING` were defined inside the hook, and
 * `GROUP_PADDING` was duplicated in `services/elkLayoutOptions.ts`, so
 * services had to import from hooks. Pure module — no imports.
 */

// ── Node Dimensions ──────────────────────────────────────────────────────────

/** Uniform card size — SOTA: same dimensions for all C4 element types. */
export const CARD = { width: 200, height: 100 };
/** Compact L4 file node (file-name tile). */
export const FILE = { width: 140, height: 36 };
/** DB-Card (SqlTableNode) – Header + Spalten-Zeilen. Höhe variiert mit der Spaltenanzahl. */
export const TABLE = { width: 220, headerHeight: 32, rowHeight: 22, minHeight: 60 };
/** Default group size used when ELK hasn't computed dimensions (e.g. no children). */
export const GROUP_MIN = { width: 400, height: 300 };
/** Padding inside group nodes (top, right, bottom, left). Must match ELK padding option. */
export const GROUP_PADDING = { top: 40, right: 30, bottom: 30, left: 30 };

/**
 * Gesamthöhe einer DB-Card aus der Spaltenanzahl (für ELK-Layout, INC 3.3).
 */
export function tableNodeHeight(columnCount: number): number {
  return TABLE.headerHeight + columnCount * TABLE.rowHeight;
}
