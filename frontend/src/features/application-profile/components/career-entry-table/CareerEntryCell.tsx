/**
 * CareerEntryCell – Rendert eine Datenzelle einer Karriere-Zeile passend
 * zur Spalte: Inline-Edit (position, company, project_url),
 * DateInput (start/end), Inline-Textarea (Beschreibung DE/EN) und StatusCell.
 */
import StatusCell from '@src/components/atoms/StatusCell/StatusCell';
import DateInput from '@src/components/primitives/DateInput/DateInput';
import TableInlineEditCell from '@src/components/table/TableInlineEditCell';

import type { CareerRow } from '../../hooks/useCareerEntryTable';
import type { CareerColumnKey } from '../../utils/careerEntryColumns';

interface CareerEntryCellProps {
  row: CareerRow;
  colKey: CareerColumnKey;
  /** Persists one snake_case field ('company', 'description_de', …). */
  onFieldSave: (row: CareerRow, field: string, value: string) => void | Promise<void>;
}

/** Renders a single data cell for a career row based on the column key. */
export default function CareerEntryCell({ row, colKey, onFieldSave }: CareerEntryCellProps) {
  switch (colKey) {
    case 'position':
      return (
        <TableInlineEditCell
          value={row.position}
          onSave={(v) => onFieldSave(row, 'position', v)}
        />
      );
    case 'company':
      return (
        <TableInlineEditCell
          value={row.company ?? ''}
          onSave={(v) => onFieldSave(row, 'company', v)}
        />
      );
    case 'project_url':
      return (
        <TableInlineEditCell
          value={row.project_url ?? ''}
          onSave={(v) => onFieldSave(row, 'project_url', v)}
        />
      );
    case 'start_date':
      return (
        <DateInput
          value={row.start_date}
          onChange={(iso) => void onFieldSave(row, 'start_date', iso)}
        />
      );
    case 'end_date':
      return (
        <DateInput
          value={row.end_date ?? ''}
          onChange={(iso) => void onFieldSave(row, 'end_date', iso)}
        />
      );
    case 'description_de':
      return (
        <TableInlineEditCell
          value={row.description_de ?? ''}
          textarea
          onSave={(v) => onFieldSave(row, 'description_de', v)}
        />
      );
    case 'description_en':
      return (
        <TableInlineEditCell
          value={row.description_en ?? ''}
          textarea
          onSave={(v) => onFieldSave(row, 'description_en', v)}
        />
      );
    case 'status':
      return (
        <StatusCell
          statusableType="application_career_entry"
          statusableId={row.id}
          currentStatus={row.status}
          currentColor={row.status_color_token}
        />
      );
    default:
      return null;
  }
}
