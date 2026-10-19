import type { DropdownItem } from '@src/components/molecules/Dropdown/Dropdown';

import type { ReactElement, ReactNode } from 'react';

export interface TableColumnProps {
  label: string;
  search?: boolean;
  defaultSort?: 'asc' | 'desc';
  filter?: ReactElement | ((state: Record<string, unknown>) => ReactElement);
  width?: string;
  /** Row field name whose value is shown as a native hover tooltip on this cell. */
  tooltipField?: string;
  /** Tooltip text shown on the column header label. */
  headerTooltip?: string;
  /** Set false to disable sorting on this column (e.g. action/render columns). */
  sortable?: boolean;
  /** Removes cell padding (px-0) for narrow spacer/separator columns. */
  compact?: boolean;
  /** Text alignment for header and data cells. */
  alignment?: 'left' | 'center' | 'right';
  /** Row field holding the raw sort value when the cell renders a ReactNode (e.g. a slider). */
  sortField?: string;
  /** Renders the cell as an inline-editable text field; persists on blur/Enter. */
  inlineEdit?: boolean;
  /** Renders the cell as an inline-editable password field with show/hide toggle. */
  inlineEditPassword?: boolean;
  /** Save handler for inline edits. Called with the row and the new string value. */
  onInlineEdit?: (row: Record<string, unknown>, value: string) => void | Promise<void>;
  /** Custom cell renderer. When provided, overrides default value display. */
  renderCell?: (row: Record<string, unknown>) => ReactNode;
  // ── Ghost Row ──
  /** Ghost row input type for this column. Omitting disables the column in ghost row. */
  ghostInput?: 'text' | 'combobox' | 'checkbox' | 'date' | 'textarea';
  /** Combobox options when ghostInput is 'combobox'. */
  ghostOptions?: DropdownItem[];
  /** Default value for ghost row (e.g. true for an active checkbox). */
  ghostDefault?: unknown;
  /** Placeholder text for ghost row inputs. */
  ghostPlaceholder?: string;
  /** Custom ghost row cell renderer. Overrides ghostInput when provided. */
  ghostRenderCell?: (props: { value: unknown; onChange: (value: unknown) => void; disabled: boolean }) => ReactNode;
}
