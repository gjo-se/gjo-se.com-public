import { DndContext, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, arrayMove, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import Button from '@src/components/primitives/Button';
import Dialog from '@src/components/primitives/Dialog';
import DialogContent from '@src/components/primitives/Dialog/DialogContent';
import DialogFooter from '@src/components/primitives/Dialog/DialogFooter';
import DialogHeader from '@src/components/primitives/Dialog/DialogHeader';
import DialogTitle from '@src/components/primitives/Dialog/DialogTitle';
import Text from '@src/components/primitives/Text';
import { showErrorToast } from '@src/lib/errorToast';

import { fetchAdminSkills, reorderSkills, type SkillAdminOut } from '../../services/curation';
import { sortDialogScrollVariants } from '../../utils/skillCurationVariants';

import SortableSkill from './SortableSkill';

import type { SkillGroupSkillSortDialogProps } from '../../utils/skillGroupSkillSortDialogTypes';

/**
 *
 */
export default function SkillGroupSkillSortDialog({
  open,
  onOpenChange,
  groupId,
  groupLabel,
}: SkillGroupSkillSortDialogProps) {
  const [skills, setSkills] = useState<SkillAdminOut[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const skillIds = useMemo(() => skills.map(skill => skill.id), [skills]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    fetchAdminSkills({
      group_id: String(groupId),
      limit: 500,
      sort_by: 'sort',
      sort_order: 'asc',
    })
      .then(data => { if (!cancelled) setSkills([...data].sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0))); })
      .catch(() => { if (!cancelled) showErrorToast('Fehler beim Laden der Skills.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [groupId, open]);

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const oldIndex = skills.findIndex(skill => skill.id === active.id);
    const newIndex = skills.findIndex(skill => skill.id === over.id);
    if (oldIndex !== -1 && newIndex !== -1) setSkills(arrayMove(skills, oldIndex, newIndex));
  };

  const save = async () => {
    setSaving(true);
    try {
      await reorderSkills(groupId, skills.map(skill => skill.id));
      toast.success('Skill-Reihenfolge gespeichert.');
      onOpenChange(false);
    } catch { showErrorToast('Fehler beim Speichern der Reihenfolge.'); }
    finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Skills sortieren – {groupLabel}</DialogTitle></DialogHeader>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          {loading ? <Text size="sm" color="muted">Lädt…</Text> : (
            <SortableContext items={skillIds} strategy={verticalListSortingStrategy}>
              <div className={sortDialogScrollVariants()}>
                {skills.map(skill => <SortableSkill key={skill.id} skill={skill} />)}
              </div>
            </SortableContext>
          )}
        </DndContext>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Abbrechen</Button>
          <Button onClick={() => void save()} disabled={saving || loading}>{saving ? 'Speichern…' : 'Speichern'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
