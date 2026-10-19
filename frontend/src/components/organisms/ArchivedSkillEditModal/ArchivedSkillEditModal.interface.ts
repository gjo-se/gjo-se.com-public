import type { SkillRadarItem } from '../../molecules/SkillRadar/SkillRadar.types';

export interface ArchivedSkillEditModalProps {
  /** The archived skill being edited. */
  skill: SkillRadarItem;
  /** Whether the modal is open. */
  open: boolean;
  /** Called when the modal's open state changes. */
  onOpenChange: (open: boolean) => void;
  /** Called after a successful save. */
  onSaved: (skillId: number, status: string, importance: number | null, level: number | null) => void;
}
