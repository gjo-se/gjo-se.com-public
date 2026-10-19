import { toast } from 'sonner';

import Text from '@src/components/primitives/Text';
import TableInlineEditCell from '@src/components/table/TableInlineEditCell';
import { setProjectMyStartDate } from '@src/lib/api/aiscope';

export interface MyStartDateCellProps {
  /** Canonical project id whose manual start override is edited. */
  projectId: number;
  /** Current override (`project.my_start_date`; null = not set). */
  value: string | null;
  /** Formatted raw start (`project.start_date`) shown when no override is set. */
  fallback: string;
  /** Called after a successful save so the page reloads its data. */
  onRefetch: () => void;
}

/**
 * MyStartDateCell – click-to-edit field for the master's manual start override.
 *
 * Shows the raw scraped `start_date` while no override is set. A click turns it
 * into an inline input: `MM/YYYY` or `DD.MM.YYYY` override the posting text and
 * the field; an immediate token (`asap`/`sofort`/… ) keeps the start explicitly
 * "as early as possible", an ignore token (`-`/`nein`/`ignore`/`n/a`) suppresses
 * the start, and an empty value clears the override (fallback: text → field).
 */
export default function MyStartDateCell({
  projectId,
  value,
  fallback,
  onRefetch,
}: MyStartDateCellProps) {
  return (
    <div className="flex items-center gap-1">
      <TableInlineEditCell
        value={value ?? ''}
        emptyPlaceholder={fallback}
        onSave={async (next) => {
          const token = next.trim();
          try {
            await setProjectMyStartDate(projectId, token === '' ? null : token);
            onRefetch();
          } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : 'Speichern fehlgeschlagen.');
          }
        }}
      />
      {value ? (
        <div className="shrink-0">
          <Text as="span" size="xs" color="muted">
            manuell
          </Text>
        </div>
      ) : null}
    </div>
  );
}
