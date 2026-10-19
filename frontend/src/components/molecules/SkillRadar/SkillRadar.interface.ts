import type { SkillBadgeItem } from '@src/lib/api/aiscopeTypes';

export interface SkillRadarProps {
  skills: SkillBadgeItem[]
  label: string
  onClick?: () => void
}
