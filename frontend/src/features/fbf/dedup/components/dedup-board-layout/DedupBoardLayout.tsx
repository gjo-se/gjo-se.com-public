/**
 * DedupBoardLayout – 3-column responsive shell for the dedup board.
 *
 * Layout driven by the Column Registry (columns/registry.ts) —
 * column count, labels, and toolbar mapping are centralised.
 * Only the component slot per column is hand-picked because
 * SP3 has a fundamentally different Card-wrapping structure.
 */

import Card, { CardContent } from '@src/components/primitives/Card';
import Text from '@src/components/primitives/Text';

import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';
import { COLUMNS } from '../../utils/registry';
import MastersToolbar from '../board-toolbar/MastersToolbar';
import PinnedSlavesToolbar from '../board-toolbar/PinnedSlavesToolbar';
import SlavesToolbar from '../board-toolbar/SlavesToolbar';
import DedupDndContext from '../dedup-dnd-context/DedupDndContext';
import DropZoneBar from '../drop-zone-bar/DropZoneBar';
import MastersColumn from '../masters-column/MastersColumn';
import PinnedInfoPanel from '../pinned-info-panel/PinnedInfoPanel';
import SlavesColumn from '../slaves-column/SlavesColumn';

/** Number of columns in the layout. */
const COL_COUNT = COLUMNS.length;

/** Table color scheme – direct-child Card wrappers (SP1/SP2). */
const CARD_SURFACE_DIRECT =
  '[&>[data-slot=card]]:bg-white dark:[&>[data-slot=card]]:bg-gray-900 [&>[data-slot=card]]:ring-gray-200 dark:[&>[data-slot=card]]:ring-gray-700';
const CARD_SURFACE_DIRECT_LEAD =
  '[&>[data-slot=card]]:bg-gray-50 dark:[&>[data-slot=card]]:bg-gray-800 [&>[data-slot=card]]:ring-gray-200 dark:[&>[data-slot=card]]:ring-gray-700';

/** Deep Card wrappers (SP3 – Card is nested inside PinnedInfoPanel). */
const CARD_SURFACE_DEEP =
  '[&_[data-slot=card]]:bg-white dark:[&_[data-slot=card]]:bg-gray-900 [&_[data-slot=card]]:ring-gray-200 dark:[&_[data-slot=card]]:ring-gray-700';

/** Toolbar component per column id. */
const TOOLBAR_MAP: Record<string, React.ComponentType> = {
  'slaves': SlavesToolbar,
  'masters': MastersToolbar,
  'pinned-slaves': PinnedSlavesToolbar,
};

/** Board content component per column id. */
const BOARD_CONTENT_MAP: Record<string, React.ComponentType> = {
  'slaves': SlavesColumn,
  'masters': MastersColumn,
  'pinned-slaves': PinnedInfoPanel,
};

/** Grid class helpers. */
const gridColsClass = (n: number) => {
  const map: Record<number, string> = { 1: 'lg:grid-cols-1', 2: 'lg:grid-cols-2', 3: 'lg:grid-cols-3' };
  return map[n] ?? 'lg:grid-cols-3';
};

/**
 *
 */
export default function DedupBoardLayout() {
  useKeyboardShortcuts();

  return (
    <DedupDndContext>
      {/* Column headings */}
      <div className={`mb-2 hidden gap-4 lg:grid ${gridColsClass(COL_COUNT)}`}>
        {COLUMNS.map((col) => (
          <Text key={col.id} as="h2" variant="h4">{col.label}</Text>
        ))}
      </div>

      {/* Toolbar row */}
      <div className={`mb-4 grid grid-cols-1 gap-4 ${gridColsClass(COL_COUNT)} lg:*:h-board-card lg:*:overflow-hidden ${CARD_SURFACE_DIRECT}`}>
        {COLUMNS.map((col) => {
          const ToolbarComponent = TOOLBAR_MAP[col.id];
          return (
            <Card key={col.id}>
              <CardContent>
                {ToolbarComponent ? <ToolbarComponent /> : null}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Status drop row */}
      <DropZoneBar />

      {/* Board row */}
      <div className={`grid grid-cols-1 gap-4 lg:h-board lg:min-h-96 ${gridColsClass(COL_COUNT)}`}>
        {COLUMNS.map((col) => {
          const BoardComponent = BOARD_CONTENT_MAP[col.id];
          const isDirect = col.surface === 'direct';
          const isLead = false;
          const surfaceClass = isLead
            ? CARD_SURFACE_DIRECT_LEAD
            : isDirect
              ? CARD_SURFACE_DIRECT
              : CARD_SURFACE_DEEP;
          const directClass = isDirect
            ? 'lg:*:data-[slot=card]:h-full lg:*:data-[slot=card]:min-h-0 lg:[&>[data-slot=card]>[data-slot=card-content]]:min-h-0 lg:[&>[data-slot=card]>[data-slot=card-content]]:flex-1 lg:[&>[data-slot=card]>[data-slot=card-content]]:overflow-hidden'
            : 'lg:*:min-h-0 lg:[&_[data-slot=card]]:h-full lg:[&_[data-slot=card]]:min-h-0 lg:[&_[data-slot=card-content]]:min-h-0 lg:[&_[data-slot=card-content]]:flex-1 lg:[&_[data-slot=card-content]]:overflow-hidden';

          return (
            <div key={col.id} className={`flex min-h-0 flex-col overflow-hidden ${directClass} ${surfaceClass}`}>
              {isDirect ? (
                <Card>
                  <CardContent>
                    {BoardComponent ? <BoardComponent /> : null}
                  </CardContent>
                </Card>
              ) : (
                BoardComponent ? <BoardComponent /> : null
              )}
            </div>
          );
        })}
      </div>
    </DedupDndContext>
  );
}
