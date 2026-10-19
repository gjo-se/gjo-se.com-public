import { useState } from 'react';

import Button from '@src/components/primitives/Button';
import Dialog, { DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@src/components/primitives/Dialog';
import Icon from '@src/components/primitives/Icon';
import type { IconName, IconVariants } from '@src/components/primitives/Icon';
import Link from '@src/components/primitives/Link';

import type { TableRowActionsProps } from './TableRowActions.interface';
void (null as unknown as TableRowActionsProps);

/** Title/aria text for a custom action – falls back to its label when disabled. */
function customActionTitle(action: { disabled: boolean; disabledTitle?: string; label: string }): string {
  if (action.disabled) return action.disabledTitle ?? action.label;
  return action.label;
}

/** True if at least one row action is configured. */
function hasAnyRowAction(flags: boolean[]): boolean {
  return flags.some(Boolean);
}

/**
 *
 */
export default function TableRowActions({
  editTo,
  onDelete,
  deleteConfirmLabel = 'Wirklich löschen?',
  deleteDisabled = false,
  deleteDisabledTitle = 'Löschen nicht möglich',
  onToggleActive,
  isActive = true,
  toggleLabel,
  toggleDisabled = false,
  toggleDisabledTitle = 'Aktion nicht verfügbar',
  onTest,
  testing = false,
  testLabel = 'Testen',
  testVariant = 'default' as IconVariants['variant'],
  onEdit,
  customActions,
}: {
  editTo?: string;
  onDelete?: () => void | Promise<void>;
  deleteConfirmLabel?: string;
  deleteDisabled?: boolean;
  deleteDisabledTitle?: string;
  onToggleActive?: () => void | Promise<void>;
  isActive?: boolean;
  toggleLabel?: string;
  onTest?: () => void | Promise<void>;
  testing?: boolean;
  testLabel?: string;
  testVariant?: IconVariants['variant'];
  onEdit?: () => void;
  toggleDisabled?: boolean;
  toggleDisabledTitle?: string;
  customActions?: {
    key: string;
    icon: IconName;
    label: string;
    onAction: () => void;
    disabled: boolean;
    disabledTitle?: string;
    filled: boolean;
  }[];
}) {
  const [showDelete, setShowDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [testRunning, setTestRunning] = useState(false);

  const handleDelete = async () => {
    if (!onDelete) return;
    setDeleting(true);
    try {
      await onDelete();
    } finally {
      setDeleting(false);
      setShowDelete(false);
    }
  };

  const handleToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onToggleActive) return;
    setToggling(true);
    try {
      await onToggleActive();
    } finally {
      setToggling(false);
    }
  };

  const handleTest = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onTest) return;
    setTestRunning(true);
    try {
      await onTest();
    } finally {
      setTestRunning(false);
    }
  };

  const hasAnyAction = hasAnyRowAction([
    Boolean(onToggleActive),
    Boolean(onTest),
    Boolean(onEdit),
    Boolean(editTo),
    Boolean(onDelete),
    Boolean(customActions?.length),
  ]);

  if (!hasAnyAction) return null;

  const toggleText = toggleActionText(toggleDisabled, toggleDisabledTitle, toggleLabel, isActive);

  return (
    <>
      <div className="flex justify-end gap-1">
        {customActions?.map((action) => (
          <Button
            key={action.key}
            variant="ghost"
            size="xs"
            onClick={(e) => {
              e.stopPropagation();
              if (action.disabled) return;
              action.onAction();
            }}
            disabled={action.disabled}
            title={customActionTitle(action)}
            aria-label={action.label}
          >
            <Icon name={action.icon} size="xs" filled={action.filled} />
          </Button>
        ))}
        {onToggleActive && (
        <Button
          variant="ghost"
          size="xs"
          onClick={handleToggle}
          disabled={toggling || toggleDisabled}
          title={toggleText}
          aria-label={toggleText}
        >
          <Icon name={isActive ? 'check-circle' : 'x-circle'} size="xs" variant={isActive ? 'green' : 'red'} />
        </Button>
        )}
        {onTest && (
        <Button
          variant="ghost"
          size="xs"
          onClick={handleTest}
          disabled={testing || testRunning}
          title={testLabel}
          aria-label={testLabel}
        >
          <Icon name="search" size="xs" variant={testVariant} />
        </Button>
        )}
        {onEdit && (
        <Button
          variant="ghost"
          size="xs"
          onClick={(e: React.MouseEvent) => {
                e.stopPropagation();
                onEdit();
              }}
          title="Bearbeiten"
          aria-label="Bearbeiten"
        >
          <Icon name="pencil" size="xs" />
        </Button>
        )}
        {editTo && !onEdit && (
          <Link
            to={editTo}
            variant="ghost"
            title="Bearbeiten"
            aria-label="Bearbeiten"
            onClick={(e: React.MouseEvent) => { e.stopPropagation(); }}
          >
            <Icon name="pencil" size="xs" />
          </Link>
        )}
        {onDelete && (
        <Button
          variant="ghost"
          size="xs"
          onClick={(e: React.MouseEvent) => {
                e.stopPropagation();
                if (deleteDisabled) return;
                setShowDelete(true);
              }}
          disabled={deleteDisabled}
          title={deleteDisabled ? deleteDisabledTitle : 'Löschen'}
          aria-label={deleteDisabled ? deleteDisabledTitle : 'Löschen'}
        >
          <Icon name="trash-2" size="xs" />
        </Button>
        )}
      </div>

      <Dialog open={showDelete} onOpenChange={(open) => !open && setShowDelete(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Löschen bestätigen</DialogTitle>
          </DialogHeader>
          <DialogDescription>{deleteConfirmLabel}</DialogDescription>
          <DialogFooter>
            <Button variant="secondary" size="sm" onClick={() => setShowDelete(false)}>
              Abbrechen
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => void handleDelete()}
              disabled={deleting}
            >
              {deleting ? 'Lädt…' : 'Löschen'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

/**
 * Target-state aware label for the toggle button (title == aria-label) – shows
 * what the click *does* (`Deaktivieren` when currently active).
 */
function toggleActionText(
  disabled: boolean,
  disabledTitle: string,
  label: string | undefined,
  isActive: boolean,
): string {
  if (disabled) return disabledTitle;
  return label ?? (isActive ? 'Deaktivieren' : 'Aktivieren');
}
