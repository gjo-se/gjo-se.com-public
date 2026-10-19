/**
 * SkillGroupSortableRow – Drag&Drop-faehige Tabellenzeile einer Skill-Gruppe.
 *
 * Zeigt Drag-Handle (⋮⋮), Label DE/EN (Inline-Edit), Prioritaet (Prio) und
 * Delete-Aktion. Muster analog ProofSubTable-SortableRow.
 */

import Button from '@src/components/primitives/Button';
import Icon from '@src/components/primitives/Icon/Icon';
import InlinePriorityCell from '@src/components/table/InlinePriorityCell';
import SortableRow from '@src/components/table/SortableRow';
import TableCell from '@src/components/table/TableCell';

import {
  GROUP_COLUMNS,
  GROUP_ROW_HEIGHT,
  PRIORITY_OPTIONS,
} from '../../utils/skillGroupAdminTabColumns';

import SkillGroupLabelCell from './SkillGroupLabelCell';

import type { SkillGroupAdminRow, SkillGroupPriority } from '../../utils/skillGroupAdminTypes';

interface SkillGroupSortableRowProps {
  row: SkillGroupAdminRow
  onDelete: (id: number) => void
  onLabelSave: (row: SkillGroupAdminRow, locale: 'de' | 'en', value: string) => void
  onPriorityChange: (row: SkillGroupAdminRow, priority: SkillGroupPriority) => void
  onSort: (row: SkillGroupAdminRow) => void
}

/** Single sortable skill-group row with drag handle, inline-edit, and delete. */
export default function SkillGroupSortableRow({
  row,
  onDelete,
  onLabelSave,
  onPriorityChange,
  onSort,
}: SkillGroupSortableRowProps) {
  return (
    <SortableRow
      id={row.id}
      columns={GROUP_COLUMNS}
      rowHeight={GROUP_ROW_HEIGHT}
      trProps={{ 'data-group-id': row.id }}
      renderColumn={(col) => {
        if (col.key === '_actions') {
          const canDelete = row.skillCount === 0;
          return (
            <TableCell key={col.key} compact alignment="center">
              <Button variant="ghost" size="xs" title="Skills sortieren" aria-label="Skills sortieren" onClick={() => onSort(row)}>
                Sortieren
              </Button>
              <Button
                variant="ghost"
                size="xs"
                title={canDelete ? 'Löschen' : 'Gruppe enthält Skills – Löschen nicht möglich'}
                aria-label={canDelete ? 'Löschen' : 'Löschen nicht möglich'}
                disabled={!canDelete}
                onClick={(e: React.MouseEvent) => {
                  e.stopPropagation();
                  onDelete(row.id);
                }}
              >
                <Icon name="trash-2" size="xs" />
              </Button>
            </TableCell>
          );
        }
        if (col.key === 'label_de') {
          return (
            <TableCell key={col.key}>
              <SkillGroupLabelCell
                value={row.label_de}
                onSave={(value) => onLabelSave(row, 'de', value)}
              />
            </TableCell>
          );
        }
        if (col.key === 'label_en') {
          return (
            <TableCell key={col.key}>
              <SkillGroupLabelCell
                value={row.label_en}
                onSave={(value) => onLabelSave(row, 'en', value)}
              />
            </TableCell>
          );
        }
        // priority
        return (
          <TableCell key={col.key}>
            <InlinePriorityCell
              value={row.priority}
              options={PRIORITY_OPTIONS}
              onChange={(value) => onPriorityChange(row, value as SkillGroupPriority)}
            />
          </TableCell>
        );
      }}
    />
  );
}
