import { toast } from 'sonner';

import TableInlineEditCell from '@src/components/table/TableInlineEditCell';

export interface RateEditCellProps {
  /** Current rate value in EUR/h; `null` = not set. */
  value: number | null;
  /** Persists the parsed rate; `null` clears it. Injected by the call site. */
  save: (value: number | null) => Promise<unknown>;
  /** Called after a successful save so the page reloads its data. */
  onRefetch: () => void;
}

/**
 * RateEditCell – click-to-edit input for an hourly rate (EUR/h).
 *
 * Displays like a read-only row by default; a click turns it into an inline input.
 * Enter/blur saves, Escape cancels; an empty value clears the rate. Parsing and
 * error handling live here, the actual persistence is injected via `save`.
 */
export default function RateEditCell({ value, save, onRefetch }: RateEditCellProps) {
  return (
    <TableInlineEditCell
      value={value != null ? String(value) : ''}
      emptyPlaceholder="–"
      onSave={async (next) => {
        const raw = next.trim().replace(',', '.');
        const parsed = raw === '' ? null : Number(raw);
        if (parsed !== null && Number.isNaN(parsed)) {
          toast.error('Ungültiger Wert.');
          return;
        }
        try {
          await save(parsed);
          onRefetch();
        } catch (err: unknown) {
          toast.error(err instanceof Error ? err.message : 'Speichern fehlgeschlagen.');
        }
      }}
    />
  );
}
