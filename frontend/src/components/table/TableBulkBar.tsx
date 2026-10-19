import Button from '@src/components/primitives/Button';
import Text from '@src/components/primitives/Text';

import type { TableBulkActionProps } from './Table.interface';

export interface TableBulkBarProps<T> {
  selectedRows: T[];
  bulkActions: TableBulkActionProps<T>[];
  onClearSelection: () => void;
}

/** Action bar shown above the table when at least one row is selected.
 *  Layout mirrors TableToolbar: actions left, clear + count right. */
export default function TableBulkBar<T>({
  selectedRows,
  bulkActions,
  onClearSelection,
}: TableBulkBarProps<T>) {
  if (selectedRows.length === 0) return null;

  return (
    <div className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-card px-6 py-6 shadow-xs ring-1 ring-foreground/10">
      <div className="flex flex-wrap items-center gap-3">
        {bulkActions.map((action) => (
          <Button
            key={action.key}
            variant={action.variant ?? 'default'}
            size="sm"
            onClick={() => void action.onAction(selectedRows)}
          >
            {action.label}
          </Button>
        ))}
      </div>
      <div className="flex items-center gap-3">
        <Button variant="secondary" size="sm" onClick={onClearSelection}>
          Reset
        </Button>
        <Text as="span" color="muted" size="sm">
          {selectedRows.length} {selectedRows.length === 1 ? 'Eintrag' : 'Einträge'}
        </Text>
      </div>
    </div>
  );
}
