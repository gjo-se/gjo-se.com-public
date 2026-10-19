/**
 * SkillCurationView – Admin curation for FBF skills using the standard Table.
 *
 * Single table for all skills (like the search-term admin page): search +
 * status filter, tag chips column with tag filter + tag sort (grouping via
 * sort), icon row-actions (confirmed toggle, edit, delete), per-row reassign
 * dropdown, and a bulk "confirm" action on selected rows.
 */

import Text from '@src/components/primitives/Text';
import Table from '@src/components/table';

import { type SkillCurationRow, useSkillCuration } from '../../hooks/useSkillCuration';

/** Renders the skill curation table (search, filters, tag chips, actions, bulk-confirm). */
export default function SkillCurationView() {
  const { table, columns, rowActions, bulkActions, loading, error, onGhostCreate } = useSkillCuration();

  if (error) {
    return <Text as="p" size="sm" color="error">Fehler: {error}</Text>;
  }

  return (
    <Table<SkillCurationRow>
      table={table}
      columns={columns}
      rowActions={rowActions}
      bulkActions={bulkActions}
      emptyMessage={loading ? 'Lädt…' : 'Keine Skills gefunden.'}
      ghostRow
      onGhostCreate={onGhostCreate}
    />
  );
}
