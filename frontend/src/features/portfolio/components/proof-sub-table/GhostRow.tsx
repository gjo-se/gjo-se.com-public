/**
 * GhostRow – Inline-Erstellungszeile für neue Proofs (Cmd+Enter).
 *
 * Pflichtfeld: statement. image_src ist optional (Textfeld).
 * Validiert vor Submit; Fehler werden über das error-Prop angezeigt.
 */

import {
  GhostRowInputCell,
  GhostRowPriorityCell,
  GhostRowShell,
} from '@src/components/table/GhostRow';
import TableCell from '@src/components/table/TableCell';

import { PRIORITY_OPTIONS, PROOF_COLUMNS, PROOF_ROW_HEIGHT } from '../../utils/proofSubTableColumns';

interface GhostRowProps {
  saving: boolean;
  data: Record<string, string>;
  onChange: (field: string, value: string) => void;
  onSubmit: () => void;
  error: string | null;
}

/** Rendert Input-Felder für image_src (optional) und statement (Pflicht). */
export default function GhostRow({ saving, data, onChange, onSubmit, error }: GhostRowProps) {
  return (
    <GhostRowShell
      saving={saving}
      error={error}
      colSpan={PROOF_COLUMNS.length}
      rowHeight={PROOF_ROW_HEIGHT}
      onSubmit={onSubmit}
    >
      {({ touched, handleKeyDown }) =>
        PROOF_COLUMNS.map((col) => {
          if (col.key === '_drag' || col.key === '_actions') {
            return <TableCell key={col.key} />;
          }
          // Frage wird erst nach dem Anlegen je Locale gepflegt.
          if (col.key === 'question') {
            return <TableCell key={col.key} />;
          }
          if (col.key === 'priority') {
            return (
              <GhostRowPriorityCell
                key={col.key}
                field={col.key}
                data={data}
                saving={saving}
                options={PRIORITY_OPTIONS}
                onChange={onChange}
              />
            );
          }
          const isRequired = col.key === 'statement';
          return (
            <GhostRowInputCell
              key={col.key}
              field={col.key}
              data={data}
              saving={saving}
              touched={touched}
              required={isRequired}
              placeholder={isRequired ? 'Antwort *' : 'Bild-Pfad'}
              onChange={onChange}
              onKeyDown={handleKeyDown}
            />
          );
        })
      }
    </GhostRowShell>
  );
}
