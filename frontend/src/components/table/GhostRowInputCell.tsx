import Input from '@src/components/primitives/Input';
import Text from '@src/components/primitives/Text';

import TableCell from './TableCell';

export interface GhostRowInputCellProps {
  field: string
  data: Record<string, string>
  saving: boolean
  touched: boolean
  required?: boolean
  placeholder: string
  onChange: (field: string, value: string) => void
  onKeyDown: (e: React.KeyboardEvent) => void
  colSpan?: number
}

/** Shared text-input cell for a ghost row, with required-field validation. */
export function GhostRowInputCell({
  field,
  data,
  saving,
  touched,
  required = false,
  placeholder,
  onChange,
  onKeyDown,
  colSpan,
}: GhostRowInputCellProps) {
  const isMissing = touched && required && !(data[field] ?? '').trim();
  return (
    <TableCell colSpan={colSpan}>
      <Input
        value={data[field] ?? ''}
        onChange={(e) => onChange(field, (e.target as HTMLInputElement).value)}
        onKeyDown={onKeyDown}
        disabled={saving}
        placeholder={placeholder}
      />
      {isMissing && (
        <Text size="xs" color="error">
          Pflichtfeld
        </Text>
      )}
    </TableCell>
  );
}
