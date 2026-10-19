/**
 * SkillGroupDragOverlayRow – Halbtransparente Vorschau waehrend des Ziehens.
 *
 * Wird im <DragOverlay> von @dnd-kit gerendert und schwebt ueber der Tabelle.
 */

import Text from '@src/components/primitives/Text';

import { GROUP_COLUMNS, GROUP_ROW_HEIGHT } from '../../utils/skillGroupAdminTabColumns';

import type { SkillGroupAdminRow } from '../../utils/skillGroupAdminTypes';

/** Floating preview row shown during drag (opacity 0.9, shadow). */
export default function SkillGroupDragOverlayRow({ row }: { row: SkillGroupAdminRow }) {
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <tbody>
        <tr
          className="bg-white shadow-lg dark:bg-gray-900"
          style={{ height: GROUP_ROW_HEIGHT, opacity: 0.9 }}
        >
          {GROUP_COLUMNS.map((col) => {
            if (col.key === '_drag' || col.key === '_actions') {
              return <td key={col.key} style={{ width: col.width }} />;
            }
            const value =
              col.key === 'label_de' ? row.label_de
                : col.key === 'label_en' ? row.label_en
                  : row.priority;
            return (
              <td key={col.key} style={{ padding: '0.5rem 0.75rem', width: col.width }}>
                <Text size="sm" lineClamp={2}>
                  {value.trim() ? value : '\u2013'}
                </Text>
              </td>
            );
          })}
        </tr>
      </tbody>
    </table>
  );
}
