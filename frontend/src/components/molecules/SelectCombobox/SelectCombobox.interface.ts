import type { SelectComboboxOption } from './SelectCombobox.types';

export interface SelectComboboxProps {
  /** Selectable options (already resolved, e.g. from a DB list or constant). */
  options: SelectComboboxOption[]
  /** Current numeric value, or null when unset. */
  value: number | null
  /** Called on selection with the parsed number, or null for the clear item. */
  onCommit: (value: number | null) => void
  /** Renders a trailing "set no value" item that commits null. */
  allowClear?: boolean
  /** Label of the clear item, defaults to `Keinen Wert setzen`. */
  clearLabel?: string
  /** Input placeholder; defaults to the current label (or `–`). */
  placeholder?: string
  /** Focuses the input on mount (click-to-edit mode). */
  autoFocus?: boolean
  /** Forwarded to the input `onBlur`. */
  onBlur?: () => void
  /** Forwarded to the input `onKeyDown` for the Escape key. */
  onEscape?: () => void
}
