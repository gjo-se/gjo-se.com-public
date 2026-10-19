import type { IconName, IconVariants } from '@src/components/primitives/Icon';

export interface TableRowActionsProps<T = never> {
  key?: string;
  icon?: IconName | ((row: T) => IconName);
  label?: string;
  confirm?: string;
  onAction: (row: T) => Promise<void>;
  /** Per-row predicate; when it returns true the action is disabled (grayed out). */
  disabled?: (row: T) => boolean;
  /** Per-row predicate; when it returns true the icon is filled (solid). */
  filled?: (row: T) => boolean;
  /** Tooltip shown on the disabled action button. */
  disabledTitle?: string;
  testingId?: string | null;
  testVariant?: IconVariants['variant'] | ((row: T) => IconVariants['variant']);
  testLabel?: string | ((row: T) => string);
  editTo?: string;
  onDelete?: () => void | Promise<void>;
  deleteConfirmLabel?: string;
  deleteDisabled?: boolean;
  deleteDisabledTitle?: string;
  onToggleActive?: () => void | Promise<void>;
  isActive?: boolean;
  toggleLabel?: string;
  toggleDisabled?: boolean;
  toggleDisabledTitle?: string;
  onTest?: () => void | Promise<void>;
  testing?: boolean;
  onEdit?: () => void;
}
