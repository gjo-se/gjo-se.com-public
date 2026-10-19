/**
 * JobRoleCurationView – Admin curation for FBF job roles using the standard Table.
 *
 * Search + status filter, icon row-actions (confirmed toggle, delete),
 * per-row reassign dropdown, and a bulk "confirm" action on selected rows.
 */

import Text from '@src/components/primitives/Text';
import Table from '@src/components/table';

import { type JobRoleCurationRow, useJobRoleCuration } from '../../hooks/useJobRoleCuration';

/** Renders the job role curation table (search, filter, actions, bulk-confirm). */
export default function JobRoleCurationView() {
  const { table, columns, rowActions, bulkActions, loading, error, onGhostCreate } = useJobRoleCuration();

  if (error) {
    return <Text as="p" size="sm" color="error">Fehler: {error}</Text>;
  }

  return (
    <Table<JobRoleCurationRow>
      table={table}
      columns={columns}
      rowActions={rowActions}
      bulkActions={bulkActions}
      emptyMessage={loading ? 'Lädt…' : 'Keine Job-Rollen gefunden.'}
      ghostRow
      onGhostCreate={onGhostCreate}
    />
  );
}
