/**
 * PortfolioDragOverlayRow – Halbtransparente Vorschau während des Ziehens.
 *
 * Wird im <DragOverlay> von @dnd-kit gerendert und schwebt über der Tabelle.
 */

import Text from '@src/components/primitives/Text';

import { PORTFOLIO_COLUMNS, PORTFOLIO_ROW_HEIGHT } from '../../utils/portfolioAdminTableColumns';

import type { PortfolioAdminRow } from '../../hooks/usePortfolioAdminTable';


/** Floating preview row shown during drag (opacity 0.9, shadow). */
export default function PortfolioDragOverlayRow({ row }: { row: PortfolioAdminRow }) {
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <tbody>
        <tr
          className="bg-white shadow-lg dark:bg-gray-900"
          style={{ height: PORTFOLIO_ROW_HEIGHT, opacity: 0.9 }}
        >
          {PORTFOLIO_COLUMNS.map((col) => {
            if (col.key === '_drag' || col.key === '_actions') {
              return <td key={col.key} style={{ width: col.width }} />;
            }
            const value = row[col.key];
            return (
              <td key={col.key} style={{ padding: '0.5rem 0.75rem', width: col.width }}>
                <Text size="sm" lineClamp={2}>
                  {value ?? '–'}
                </Text>
              </td>
            );
          })}
        </tr>
      </tbody>
    </table>
  );
}
