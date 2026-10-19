import DateInput from '@src/components/primitives/DateInput/DateInput';
import Input from '@src/components/primitives/Input';
import Textarea from '@src/components/primitives/Textarea';

export interface GhostRowFieldProps {
  /** Input kind derived from the column definition. */
  ghost: 'text' | 'date' | 'textarea'
  value: string
  placeholder?: string
  disabled?: boolean
  onValueChange: (value: string) => void
  /** Enter handler – dates ignore it (own picker), text/textarea share it. */
  onKeyDown?: (e: React.KeyboardEvent) => void
}

/**
 * Shared column-driven ghost-row input.
 *
 * Maps a column's `ghost` kind to the matching primitive (`date` → DateInput,
 * `textarea` → Textarea, else Input) so table ghost rows don't re-implement the
 * same switch. The caller owns the value/onChange wiring.
 */
export function GhostRowField({
  ghost,
  value,
  placeholder,
  disabled,
  onValueChange,
  onKeyDown,
}: GhostRowFieldProps) {
  if (ghost === 'date') {
    return <DateInput value={value} onChange={onValueChange} />;
  }
  if (ghost === 'textarea') {
    return (
      <Textarea
        value={value}
        onChange={(e) => onValueChange((e.target as HTMLTextAreaElement).value)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        rows={2}
      />
    );
  }
  return (
    <Input
      value={value}
      onChange={(e) => onValueChange((e.target as HTMLInputElement).value)}
      onKeyDown={onKeyDown}
      placeholder={placeholder}
      disabled={disabled}
    />
  );
}
