/**
 * DecisionSubTable – Sub-Tabelle für die Entscheidungen eines Erfahrungs-Projekts.
 *
 * Dünner Wrapper um den generischen `DialogSubTable`: Entscheidungen der AKTIVEN
 * Sprache (locale) als inline-editierbare Zeilen (`title`, `body`, `discarded`).
 * Ghost Row fügt eine leere Zeile an, DnD ändert die Reihenfolge, Löschen über
 * den Confirm-Dialog. Die jeweils andere Sprache bleibt unverändert im
 * `translations`-Objekt erhalten.
 */
import { DialogSubTable } from '@src/components/table/DialogSubTable';
import TableHead from '@src/components/table/TableHead';
import type { DecisionLocaleFields } from '@src/lib/api/applicationProfile';

import DecisionSortableRow from './DecisionSortableRow';


/** One decision row in the dialog-local edit model (stable client key + DE/EN map). */
export interface DecisionRow {
  key: string;
  translations: Record<string, DecisionLocaleFields>;
}

export interface DecisionSubTableProps {
  /** Current decision rows (dialog-local state). */
  items: DecisionRow[];
  /** Active language of the dialog switch – decides which fields are shown. */
  locale: 'de' | 'en';
  /** Called with the next full list after add/remove/reorder/edit. */
  onChange: (items: DecisionRow[]) => void;
}

let keySeq = 0;
/** Decision sub-table with inline edit, ghost row, DnD order and delete. */
export default function DecisionSubTable({ items, locale, onChange }: DecisionSubTableProps) {
  return (
    <DialogSubTable<DecisionRow>
      title="Entscheidungen"
      subtitle={`Lösung WIE · ${locale.toUpperCase()}`}
      items={items}
      colSpan={5}
      emptyText="Keine Entscheidungen vorhanden."
      addLabel="＋ Entscheidung hinzufügen"
      createRow={() => ({ key: nextKey(), translations: {} })}
      locale={locale}
      onChange={onChange}
      setField={(item, loc, field, value) => ({
        ...item,
        translations: {
          ...item.translations,
          [loc]: { ...item.translations[loc], [field]: value } as DecisionLocaleFields,
        },
      })}
      columns={(
        <tr>
          <TableHead compact alignment="center" style={{ width: '40px' }}>
            Sort
          </TableHead>
          <TableHead style={{ width: '180px' }}>Titel</TableHead>
          <TableHead>Inhalt</TableHead>
          <TableHead>Verworfen</TableHead>
          <TableHead compact style={{ width: '80px' }} aria-label="Aktionen" />
        </tr>
      )}
      renderRow={(item, onFieldChange, onDelete) => (
        <DecisionSortableRow
          key={item.key}
          row={item}
          locale={locale}
          onFieldChange={onFieldChange}
          onDelete={onDelete}
        />
      )}
    />
  );
}

/** Generates a stable client-side row key (never sent to the API). */
function nextKey(): string {
  keySeq += 1;
  return `decision-${keySeq}`;
}
