import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

import Button from '@src/components/primitives/Button';
import Combobox from '@src/components/primitives/Combobox';
import ComboboxContent from '@src/components/primitives/Combobox/ComboboxContent';
import ComboboxEmpty from '@src/components/primitives/Combobox/ComboboxEmpty';
import ComboboxInput from '@src/components/primitives/Combobox/ComboboxInput';
import ComboboxItem from '@src/components/primitives/Combobox/ComboboxItem';
import ComboboxList from '@src/components/primitives/Combobox/ComboboxList';
import Dialog, { DialogContent, DialogHeader, DialogTitle } from '@src/components/primitives/Dialog';
import Icon from '@src/components/primitives/Icon';
import Spinner from '@src/components/primitives/Spinner';
import Text from '@src/components/primitives/Text';
import { fetchSimilarMasters, updateSkill } from '@src/lib/api/aiscope';

import type { ArchivedSkillEditModalProps } from './ArchivedSkillEditModal.interface';

/**
 *
 */
export type { ArchivedSkillEditModalProps } from './ArchivedSkillEditModal.interface';

export default function ArchivedSkillEditModal({
  skill, open, onOpenChange, onSaved,
}: ArchivedSkillEditModalProps) {
  const [masterSkills, setMasterSkills] = useState<{ id: number; name: string; similarity: number }[]>([]);
  const [loadingMasters, setLoadingMasters] = useState(false);
  const [selectedMasterId, setSelectedMasterId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [pending, setPending] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Reset state + fetch masters when modal opens
  useEffect(() => {
    if (!open || skill.id === 0) return;
    void (async () => {
      setSelectedMasterId(null);
      setSearchQuery('');
      setLoadingMasters(true);
      try {
        const items = await fetchSimilarMasters(skill.id);
        setMasterSkills(items);
      } catch {
        toast.error('Master-Skills konnten nicht geladen werden.');
      } finally {
        setLoadingMasters(false);
      }
    })();
  }, [open, skill.id]);

  const filteredMasters = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return masterSkills;
    return masterSkills.filter(m => m.name.toLowerCase().includes(q));
  }, [searchQuery, masterSkills]);

  const selectedMasterName = selectedMasterId
    ? masterSkills.find(m => m.id === selectedMasterId)?.name ?? ''
    : '';

  /** Auto-save: assign (or unassign) the master via canonical_id. */
  const autoSave = useCallback((masterId: number | null) => {
    const payload: Record<string, unknown> = {
      name: skill.name,
      status: 'confirmed',
    };
    if (masterId !== undefined) payload.canonical_id = masterId;

    setPending(true);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      updateSkill(skill.id, payload as Record<string, unknown>)
        .then(() => {
          onSaved(skill.id, 'confirmed', null, null);
          toast.success(`"${skill.name}" zugewiesen.`);
        })
        .catch((err: unknown) => {
          const msg = err instanceof Error ? err.message : 'Unbekannter Fehler';
          toast.error(`${msg}`);
        })
        .finally(() => setPending(false));
    }, 150);
  }, [skill.id, skill.name, onSaved]);

  function handleMasterSelect(id: number) {
    setSelectedMasterId(id);
    setSearchQuery('');
    autoSave(id);
  }

  function handleClearMaster() {
    setSelectedMasterId(null);
    setSearchQuery('');
    autoSave(null);
  }

  function handleClose() {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle layout="inline">
            <Text as="span">{skill.name}</Text>
            {(pending || loadingMasters) && <Spinner size="sm" />}
          </DialogTitle>
        </DialogHeader>

        <div className="flex items-end gap-1 pt-4">
          <div className="flex-1">
            <Combobox
              value={selectedMasterId != null ? String(selectedMasterId) : ''}
              onValueChange={(val: string | null) => {
                if (!val) return;
                const id = Number(val);
                if (!Number.isNaN(id) && id > 0) handleMasterSelect(id);
              }}
            >
              <ComboboxInput
                placeholder={loadingMasters ? 'Lade…' : 'Master-Skill suchen…'}
                value={searchQuery || selectedMasterName}
                onChange={(e) => {
                  setSearchQuery((e.target as HTMLInputElement).value);
                  if (selectedMasterId != null) setSelectedMasterId(null);
                }}
              />
              <ComboboxContent>
                <ComboboxList>
                  {filteredMasters.map((m) => (
                    <ComboboxItem key={m.id} value={String(m.id)}>
                      <div className="flex-1 overflow-hidden">
                        <Text as="span" lineClamp={1}>{m.name}</Text>
                      </div>
                      <div className="ml-2 shrink-0">
                        <Text as="span" size="xs" color="muted" tabular>
                          {Math.round(m.similarity * 100)}%
                        </Text>
                      </div>
                    </ComboboxItem>
                  ))}
                </ComboboxList>
                {filteredMasters.length === 0 && searchQuery.trim() && (
                  <ComboboxEmpty>Keine Skills gefunden</ComboboxEmpty>
                )}
              </ComboboxContent>
            </Combobox>
          </div>
          {selectedMasterId != null && (
            <Button
              variant="ghost"
              size="sm"
              title="Master-Zuordnung entfernen"
              aria-label="Master-Zuordnung entfernen"
              onClick={handleClearMaster}
            >
              <Icon name="x" size="xs" />
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
