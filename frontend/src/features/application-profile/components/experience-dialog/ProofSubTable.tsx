/**
 * ProofSubTable – Sub-Tabelle für die Proofs (Belege) eines Erfahrungs-Projekts.
 *
 * Dünner Wrapper um den generischen `DialogSubTable`: Zeile je Proof mit dem
 * Feld `text` der AKTIVEN Sprache (locale). Ghost Row fügt eine leere Zeile an,
 * DnD ändert die Reihenfolge, Löschen über den Confirm-Dialog. Die jeweils
 * andere Sprache bleibt unverändert im `translations`-Objekt erhalten.
 */
import { DialogSubTable } from '@src/components/table/DialogSubTable';
import TableHead from '@src/components/table/TableHead';
import type { ProofLocaleFields } from '@src/lib/api/applicationProfile';

import ProofSortableRow from './ProofSortableRow';


/** One proof row in the dialog-local edit model (stable client key + DE/EN map). */
export interface ProofRow {
  key: string;
  translations: Record<string, ProofLocaleFields>;
}

export interface ProofSubTableProps {
  /** Current proof rows (dialog-local state). */
  items: ProofRow[];
  /** Active language of the dialog switch – decides which fields are shown. */
  locale: 'de' | 'en';
  /** Called with the next full list after add/remove/reorder/edit. */
  onChange: (items: ProofRow[]) => void;
}

let keySeq = 0;
/** Generates a stable client-side row key (never sent to the API). */
function nextKey(): string {
  keySeq += 1;
  return `proof-${keySeq}`;
}

/** Proof sub-table with inline edit, ghost row, DnD order and delete. */
export default function ProofSubTable({ items, locale, onChange }: ProofSubTableProps) {
  return (
    <DialogSubTable<ProofRow>
      title="Proofs"
      subtitle={`Belege · ${locale.toUpperCase()}`}
      items={items}
      colSpan={3}
      emptyText="Keine Proofs vorhanden."
      addLabel="＋ Proof hinzufügen"
      createRow={() => ({ key: nextKey(), translations: {} })}
      locale={locale}
      onChange={onChange}
      setField={(item, loc, _field, value) => ({
        ...item,
        translations: { ...item.translations, [loc]: { ...item.translations[loc], text: value } },
      })}
      columns={(
        <tr>
          <TableHead compact alignment="center" style={{ width: '40px' }}>
            Sort
          </TableHead>
          <TableHead>Text</TableHead>
          <TableHead compact style={{ width: '80px' }} aria-label="Aktionen" />
        </tr>
      )}
      renderRow={(item, onFieldChange, onDelete) => (
        <ProofSortableRow
          key={item.key}
          row={item}
          locale={locale}
          onFieldChange={(key, value) => onFieldChange(key, 'text', value)}
          onDelete={onDelete}
        />
      )}
    />
  );
}
