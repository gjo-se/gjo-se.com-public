/**
 * SkillGroupAdminTab.interface – Row type for the admin skill-group table.
 *
 * Labels are flattened from the API's `labels: { de, en }` dict into dedicated
 * columns so the standard `Table` inline-edit can access each locale directly.
 */

export interface SkillGroupAdminRow {
  id: number
  sort: number
  priority: SkillGroupPriority
  label_de: string
  label_en: string
  skillCount: number
}

export type SkillGroupPriority = 'high' | 'medium' | 'base';
