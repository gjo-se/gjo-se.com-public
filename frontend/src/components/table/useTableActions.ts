import { tableRowActionsRegistry } from './TableRowActions.registry';

import type { TableRowActionsProps } from './TableRowActions.interface';

/**
 * useTableActions – Erzeugt TableRowActionsProps<T>[] aus Handler-Funktionen.
 *
 * Jeder übergebene Handler wird mit Defaults (icon, label, confirm)
 * aus der tableRowActionsRegistry zu einem TableRowActionsProps-Objekt kombiniert.
 * Nur Handler, die tatsächlich übergeben wurden, erscheinen im Array.
 *
 * @param handlers – Optionale Callbacks für Built-in-Aktionen.
 * @returns Liste von TableRowActionsProps<T>.
 *
 * @example
 * const actions = useTableActions<Project>({
 *   onEdit: async (row) => { await editProject(row.id); },
 *   onDelete: async (row) => { await deleteProject(row.id); },
 * });
 * // → [{ key: 'edit', icon: 'pencil', label: 'Bearbeiten', onAction: ... },
 * //    { key: 'delete', icon: 'trash-2', label: 'Löschen', confirm: 'Wirklich löschen?', onAction: ... }]
 */
export function useTableActions<T>(handlers: {
  onToggle?: (row: T) => Promise<void>;
  onDelete?: (row: T) => Promise<void>;
  onEdit?: (row: T) => Promise<void>;
  onTest?: (row: T) => Promise<void>;
  /** Per-row predicate; when it returns true the toggle action is disabled (inactive icon, grayed out). */
  toggleDisabled?: (row: T) => boolean;
  /** Per-row predicate; when it returns true the delete action is disabled (grayed out). */
  deleteDisabled?: (row: T) => boolean;
  /** Tooltip shown on the disabled delete button. */
  deleteDisabledTitle?: string;
  /** Additional custom actions (favorites, bookmarks, promote, etc.). */
  customActions?: TableRowActionsProps<T>[];
}): TableRowActionsProps<T>[] {
  const actions: TableRowActionsProps<T>[] = [];

  if (handlers.onToggle) {
    const defaults = tableRowActionsRegistry.toggle;
    actions.push({
      key: 'toggle',
      icon: defaults.icon,
      label: defaults.label,
      confirm: 'confirm' in defaults ? (defaults as { confirm?: string }).confirm : undefined,
      onAction: handlers.onToggle,
      disabled: handlers.toggleDisabled,
    });
  }

  if (handlers.onDelete) {
    const defaults = tableRowActionsRegistry.delete;
    actions.push({
      key: 'delete',
      icon: defaults.icon,
      label: defaults.label,
      confirm: 'confirm' in defaults ? (defaults as { confirm?: string }).confirm : undefined,
      onAction: handlers.onDelete,
      disabled: handlers.deleteDisabled,
      disabledTitle: handlers.deleteDisabledTitle,
    });
  }

  if (handlers.onEdit) {
    const defaults = tableRowActionsRegistry.edit;
    actions.push({
      key: 'edit',
      icon: defaults.icon,
      label: defaults.label,
      confirm: 'confirm' in defaults ? (defaults as { confirm?: string }).confirm : undefined,
      onAction: handlers.onEdit,
    });
  }

  if (handlers.onTest) {
    const defaults = tableRowActionsRegistry.test;
    actions.push({
      key: 'test',
      icon: defaults.icon,
      label: defaults.label,
      onAction: handlers.onTest,
    });
  }

  if (handlers.customActions) {
    actions.push(...handlers.customActions);
  }

  return actions;
}
