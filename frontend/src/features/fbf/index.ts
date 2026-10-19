// SearchTerm sub-module
export {
  createSearchTerm,
  deleteSearchTerm,
  fetchActiveSearchTerms,
  fetchAllSearchTerms,
  updateSearchTerm,
  type SearchTerm,
  type SearchTermCreate,
  type SearchTermUpdate,
} from '@src/lib/api/searchTerms';
export { useActiveSearchTerms } from '@src/providers/searchTerms/useActiveSearchTerms';
export { useAdminSearchTerms } from './search-term/hooks/useAdminSearchTerms';
export { default as AdminSearchTermsActions } from './search-term/components/admin-search-terms-data-table/AdminSearchTermsActions';

// JobRole sub-module
export { useJobRoleCuration } from './job-role/hooks/useJobRoleCuration';
export { useJobRolePendingCount } from './job-role/hooks/useJobRolePendingCount';
export { default as JobRoleCurationView } from './job-role/components/curation/JobRoleCurationView';
export { fetchAdminJobRoles } from './job-role/services/curation';
export type { JobRoleOut } from './job-role/services/curation';

// Skill sub-module
export { default as SkillCurationView } from './skill/components/curation/SkillCurationView';
export { useSkillList } from './skill/hooks/useSkillList';
export { useSkillGroups } from './skill/hooks/useSkillGroups';
export { useHomeSkillGroups } from './skill/hooks/useHomeSkillGroups';
export { useProjectSkills } from './skill/hooks/useProjectSkills';
export { useSkillCuration } from './skill/hooks/useSkillCuration';
export { useSkillPendingCount } from './skill/hooks/useSkillPendingCount';
export { useProofStore } from '@src/lib/proofStore';
export { useProofNavigation } from '@src/hooks/useProofNavigation';
export type { SkillGroupOut, SkillPublicOut } from './skill/services/skills';
export type { HomeSkillGroupCard } from './skill/hooks/useHomeSkillGroups';
export { default as ImportanceDefinitionTab } from './skill/components/importance-definition/ImportanceDefinitionTab';
export { default as LevelDefinitionTab } from './skill/components/level-definition/LevelDefinitionTab';
export { default as SkillGroupAdminTab } from './skill/components/skill-group-admin-tab/SkillGroupAdminTab';

// Dedup sub-module
export { default as DedupBoardLayout } from './dedup/components/dedup-board-layout/DedupBoardLayout';
