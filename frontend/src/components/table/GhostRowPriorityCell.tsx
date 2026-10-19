import NativeSelect from '@src/components/primitives/NativeSelect';
import NativeSelectOption from '@src/components/primitives/NativeSelect/NativeSelectOption';

import TableCell from './TableCell';

export interface GhostRowPriorityCellProps {
  field: string
  data: Record<string, string>
  saving: boolean
  options: GhostRowPriorityOption[]
  onChange: (field: string, value: string) => void
}

export interface GhostRowPriorityOption {
  value: string
  label: string
}

/** Shared priority `NativeSelect` cell for a ghost row. */
export function GhostRowPriorityCell({
  field,
  data,
  saving,
  options,
  onChange,
}: GhostRowPriorityCellProps) {
  return (
    <TableCell>
      <NativeSelect
        size="sm"
        value={data[field] ?? 'medium'}
        onChange={(e) => onChange(field, (e.target as HTMLSelectElement).value)}
        disabled={saving}
        aria-label="Priorität"
      >
        {options.map((opt) => (
          <NativeSelectOption key={opt.value} value={opt.value}>
            {opt.label}
          </NativeSelectOption>
        ))}
      </NativeSelect>
    </TableCell>
  );
}
