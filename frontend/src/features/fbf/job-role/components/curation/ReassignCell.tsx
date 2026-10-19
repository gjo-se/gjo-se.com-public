/**
 * ReassignCell – In-row job role reassignment dropdown for the curation table.
 *
 * Intercepts the combobox selection: instead of reassigning immediately, it
 * opens a safety confirmation dialog showing which job role the projects
 * will be moved to (or that the assignment will be cleared). The actual
 * reassign only happens when the admin explicitly clicks "Bestätigen".
 */

import { useState } from 'react';

import ComboboxOptionsList from '@src/components/molecules/ComboboxOptionsList/ComboboxOptionsList';
import ConfirmDialog from '@src/components/molecules/ConfirmDialog/ConfirmDialog';
import type { DropdownItem } from '@src/components/molecules/Dropdown/Dropdown';
import Combobox from '@src/components/primitives/Combobox';
import ComboboxEmpty from '@src/components/primitives/Combobox/ComboboxEmpty';
import ComboboxInput from '@src/components/primitives/Combobox/ComboboxInput';

export interface ReassignCellProps {
  targetItems: DropdownItem[]
  onReassign: (targetId: number | null) => void
}

/** Renders the reassign-target combobox with a mandatory safety confirmation. */
export default function ReassignCell({ targetItems, onReassign }: ReassignCellProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [pendingTargetId, setPendingTargetId] = useState<number | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const filtered = searchQuery.trim()
    ? targetItems.filter((i) => i.label.toLowerCase().includes(searchQuery.toLowerCase()))
    : targetItems;

  const pendingTarget = targetItems.find((i) => i.value === String(pendingTargetId ?? ''));

  const confirm = () => {
    onReassign(pendingTargetId);
    setDialogOpen(false);
    setPendingTargetId(null);
    setSearchQuery('');
  };

  const cancel = () => {
    setDialogOpen(false);
    setPendingTargetId(null);
    setSearchQuery('');
  };

  return (
    <>
      <div onClick={(e) => e.stopPropagation()}>
        <Combobox
          {...({ value: pendingTargetId != null ? String(pendingTargetId) : '', onValueChange: (newValue: string) => {
            setPendingTargetId(newValue ? Number(newValue) : null);
            setDialogOpen(true);
          } } as Record<string, unknown>)}
        >
          <ComboboxInput
            placeholder="Projekte umhängen zu…"
            value={searchQuery}
            onChange={(e) => setSearchQuery((e.target as HTMLInputElement).value)}
          />
          <ComboboxOptionsList
            options={filtered}
            footer={
              filtered.length === 0 && searchQuery.trim() ? (
                <ComboboxEmpty>Keine Job-Rollen</ComboboxEmpty>
              ) : null
            }
          />
        </Combobox>
      </div>

      <ConfirmDialog
        open={dialogOpen}
        title="Sicherheitsabfrage"
        description={
          pendingTarget ? (
            <>
              Alle Projekte dieser Job-Rolle werden auf{' '}
              <strong>{pendingTarget.label}</strong> umgehängt.
              Diese Aktion kann nicht rückgängig gemacht werden.
            </>
          ) : (
            <>
              Alle Projekt-Verknüpfungen dieser Job-Rolle werden{' '}
              <strong>entfernt</strong>.
              Diese Aktion kann nicht rückgängig gemacht werden.
            </>
          )
        }
        onCancel={cancel}
        onConfirm={confirm}
        showCloseButton={false}
      />
    </>
  );
}
