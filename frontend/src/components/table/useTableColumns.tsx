import { createColumnHelper } from '@tanstack/react-table';
import { useMemo } from 'react';

import Checkbox from '@src/components/primitives/Checkbox';
import Text from '@src/components/primitives/Text';
import Tooltip, { TooltipContent, TooltipTrigger } from '@src/components/primitives/Tooltip';

import TableInlineEditCell from './TableInlineEditCell';
import TableInlineEditPasswordCell from './TableInlineEditPasswordCell';
import TableRowActions from './TableRowActions';

import type { TableColumnProps } from './TableColumn.interface';
import type { TableColumnMetaProps } from './TableColumnMeta.interface';
import type { TableRowActionsProps } from './TableRowActions.interface';
import type { ColumnDef } from '@tanstack/react-table';

function mapRowActionsToProps<T>(row: T, rowActions: TableRowActionsProps<T>[]) {
  const findAction = (key: string) => rowActions.find((a) => a.key === key);

  const toggleAction = findAction('toggle');
  const deleteAction = findAction('delete');
  const editAction = findAction('edit');
  const testAction = findAction('test');

  const rowRecord = row as Record<string, unknown>;
  const toggleDisabled = toggleAction?.disabled ? toggleAction.disabled(row) : false;
  const isActiveRaw =
    typeof rowRecord['active'] === 'boolean' ? (rowRecord['active'] as boolean) : undefined;
  const isActive = isActiveRaw;
  const toggleLabel = isActive !== undefined ? (isActive ? 'Deaktivieren' : 'Aktivieren') : undefined;

  // Compute test visual feedback per row
  const rowId = String(rowRecord['id'] ?? '');
  const testing = testAction?.testingId === rowId;
  const testVariant = typeof testAction?.testVariant === 'function'
    ? testAction.testVariant(row)
    : testAction?.testVariant ?? 'default';
  const testLabel = typeof testAction?.testLabel === 'function'
    ? testAction.testLabel(row)
    : testAction?.testLabel ?? 'Testen';

  // Generic custom actions (any key not in the standard set).
  const standardKeys = new Set(['toggle', 'delete', 'edit', 'test']);
  const customActions = rowActions.filter((a) => a.key && !standardKeys.has(a.key));

  return {
    onToggleActive: toggleAction
      ? () => {
          void toggleAction.onAction(row);
        }
      : undefined,
    isActive,
    toggleLabel,
    toggleDisabled,
    onDelete: deleteAction
      ? () => {
          void deleteAction.onAction(row);
        }
      : undefined,
    deleteConfirmLabel: deleteAction?.confirm,
    deleteDisabled: deleteAction?.disabled ? deleteAction.disabled(row) : false,
    deleteDisabledTitle: deleteAction?.disabledTitle,
    onEdit: editAction
      ? () => {
          void editAction.onAction(row);
        }
      : undefined,
    onTest: testAction
      ? () => {
          void testAction.onAction(row);
        }
      : undefined,
    testing,
    testVariant,
    testLabel,
    customActions: customActions.map((a) => ({
      key: a.key!,
      icon: typeof a.icon === 'function' ? a.icon(row) : (a.icon ?? 'check'),
      label: a.label ?? '',
      onAction: () => { void a.onAction(row); },
      disabled: a.disabled ? a.disabled(row) : false,
      disabledTitle: a.disabledTitle,
      filled: a.filled ? a.filled(row) : false,
    })),
  };
}

/**
 *
 */
export function useTableColumns<T>(
  columns: Record<string, TableColumnProps>,
  rowActions?: TableRowActionsProps<T>[],
  enableSelection?: boolean,
): ColumnDef<T>[] {
  return useMemo(() => {
    const helper = createColumnHelper<T>();
    const defs: ColumnDef<T>[] = [];

    if (enableSelection) {
      defs.push(
        helper.display({
          id: '_select',
          header: ({ table }) => (
            <span onClick={(e) => e.stopPropagation()}>
              <Checkbox
                checked={table.getIsAllPageRowsSelected()}
                indeterminate={table.getIsSomePageRowsSelected() && !table.getIsAllPageRowsSelected()}
                onChange={(value) => table.toggleAllPageRowsSelected(value)}
                aria-label="Alle auswählen"
              />
            </span>
          ),
          cell: ({ row }) => (
            <span onClick={(e) => e.stopPropagation()}>
              <Checkbox
                checked={row.getIsSelected()}
                onChange={(value) => row.toggleSelected(value)}
                aria-label="Auswählen"
              />
            </span>
          ),
          meta: { width: '44px' } satisfies TableColumnMetaProps,
        }),
      );
    }

    Object.entries(columns).forEach(([key, col]) =>
      defs.push(
        helper.accessor(
          (row: T) => (row as Record<string, unknown>)[col.sortField ?? key],
          {
            id: key,
            header: col.headerTooltip
              ? () => (
                <Tooltip>
                  <TooltipTrigger>
                    <Text size="xs" weight="medium" color="muted">
                      {col.label}
                    </Text>
                  </TooltipTrigger>
                  <TooltipContent side="top" align="start">
                    <Text variant="caption">{col.headerTooltip}</Text>
                  </TooltipContent>
                </Tooltip>
                )
              : col.label,
            enableSorting: col.sortable !== false,
            cell: (info) => {
              const rowRecord = info.row.original as Record<string, unknown>;
              if (col.renderCell) return col.renderCell(rowRecord);
              const displayValue = rowRecord[key];
              if (col.inlineEditPassword && col.onInlineEdit) {
                return (
                  <TableInlineEditPasswordCell
                    value={displayValue == null ? '' : String(displayValue)}
                    onSave={(next) => col.onInlineEdit!(rowRecord, next)}
                  />
                );
              }
              if (col.inlineEdit && col.onInlineEdit) {
                return (
                  <TableInlineEditCell
                    value={displayValue == null ? '' : String(displayValue)}
                    onSave={(next) => col.onInlineEdit!(rowRecord, next)}
                  />
                );
              }
              if (!col.tooltipField) return displayValue as React.ReactNode;
              const tooltip = rowRecord[col.tooltipField];
              return <span title={typeof tooltip === 'string' ? tooltip : undefined}>{displayValue as React.ReactNode}</span>;
            },
            meta: {
              width: col.width,
              search: col.search,
              defaultSort: col.defaultSort,
              filter: col.filter,
              compact: col.compact,
              alignment: col.alignment,
            } satisfies TableColumnMetaProps,
          },
        ),
      ),
    );

    if (rowActions && rowActions.length > 0) {
      // Each ghost xs action button needs ~34px; size the column so none get clipped.
      const actionsWidth = `${Math.max(rowActions.length * 34 + 24, 80)}px`;
      defs.push(
        helper.display({
          id: '_actions',
          header: '',
          cell: (info) => {
            const row = info.row.original;
            const props = mapRowActionsToProps(row, rowActions);
            return <TableRowActions {...props} />;
          },
          meta: { width: actionsWidth } satisfies TableColumnMetaProps,
        }),
      );
    }

    return defs;
  }, [columns, rowActions, enableSelection]);
}
