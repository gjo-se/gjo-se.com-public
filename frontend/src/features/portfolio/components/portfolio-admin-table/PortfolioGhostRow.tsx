/**
 * PortfolioGhostRow – Inline-Erstellungszeile für neue Projekte (Cmd+Enter).
 *
 * Pflichtfeld: slug (die DE-Übersetzung wird mit leerem Titel initialisiert).
 * Validiert vor Submit; Fehler werden über das error-Prop angezeigt.
 */

import { GhostRowInputCell, GhostRowShell } from '@src/components/table/GhostRow';
import TableCell from '@src/components/table/TableCell';

import {
  PORTFOLIO_COLUMNS,
  PORTFOLIO_ROW_HEIGHT,
} from '../../utils/portfolioAdminTableColumns';

interface PortfolioGhostRowProps {
  saving: boolean;
  data: Record<string, string>;
  onChange: (field: string, value: string) => void;
  onSubmit: () => void;
  error: string | null;
}

/** Anzahl der Datenspalten (ohne Drag-Handle und Actions) für das colSpan des Slug-Inputs. */
const DATA_COLUMN_COUNT = PORTFOLIO_COLUMNS.filter(
  (col) => col.key !== '_drag' && col.key !== '_actions',
).length;

/** Rendert das Slug-Input-Feld (Pflicht) gespannt über die Datenspalten. */
export default function PortfolioGhostRow({
  saving,
  data,
  onChange,
  onSubmit,
  error,
}: PortfolioGhostRowProps) {
  return (
    <GhostRowShell
      saving={saving}
      error={error}
      colSpan={PORTFOLIO_COLUMNS.length}
      rowHeight={PORTFOLIO_ROW_HEIGHT}
      onSubmit={onSubmit}
    >
      {({ touched, handleKeyDown }) => (
        <>
          <TableCell key="_drag" />
          <GhostRowInputCell
            field="slug"
            data={data}
            saving={saving}
            touched={touched}
            required
            placeholder="Slug *"
            onChange={onChange}
            onKeyDown={handleKeyDown}
            colSpan={DATA_COLUMN_COUNT}
          />
          <TableCell key="_actions" />
        </>
      )}
    </GhostRowShell>
  );
}
