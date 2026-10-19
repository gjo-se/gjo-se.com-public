/**
 * DragOverlayRow – Halbtransparente Vorschau während des Ziehens.
 *
 * Wird im <DragOverlay> von @dnd-kit gerendert und schwebt über der Tabelle.
 * Zeigt Bild-Vorschau + Statement (gekürzt).
 */

import Text from '@src/components/primitives/Text';
import type { components } from '@src/lib/types.generated';

import { PROOF_COLUMNS, PROOF_ROW_HEIGHT } from '../../utils/proofSubTableColumns';

import ImagePreviewCell from './ImagePreviewCell';

type ProofAdminOut = components['schemas']['ProofAdminOut'];

/** Floating preview row shown during drag (opacity 0.9, shadow). */
export default function DragOverlayRow({ proof }: { proof: ProofAdminOut }) {
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <tbody>
        <tr
          className="bg-white shadow-lg dark:bg-gray-900"
          style={{ height: PROOF_ROW_HEIGHT, opacity: 0.9 }}
        >
          {PROOF_COLUMNS.map((col) => {
            if (col.key === '_drag') {
              return <td key={col.key} style={{ width: col.width }} />;
            }
            if (col.key === 'image_src') {
              return (
                <td key={col.key} style={{ padding: '0.5rem 0.75rem', width: col.width }}>
                  <ImagePreviewCell src={proof.image_src ?? null} alt="Proof" />
                </td>
              );
            }
            if (col.key === '_actions') {
              return <td key={col.key} style={{ width: col.width }} />;
            }
            return (
              <td key={col.key} style={{ padding: '0.5rem 0.75rem' }}>
                <Text size="sm" lineClamp={2}>
                  {proof.statements['de'] ?? proof.statements['en'] ?? '–'}
                </Text>
              </td>
            );
          })}
        </tr>
      </tbody>
    </table>
  );
}
