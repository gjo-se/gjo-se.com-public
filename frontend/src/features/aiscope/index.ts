/**
 * AIScope feature – Public API barrel.
 *
 * Re-exports all public types, hooks, and services
 * so consumers import from the feature root rather than deep paths.
 */

// Types
export type {
  ScraperStatus,
  ReReadStatus,
  DatePreset,
  StoredDateFilter,
  FreelancermapFilterState,
  FreelancermapScraperState,
  TextField,
  BadgesField,
  FieldEntry,
  ProjectStatus,
  ProjectPreset,
  PresetFilter,
} from './core/types';
export { PROJECT_PRESETS, PROJECT_PRESET_FILTERS, DEFAULT_PROJECT_PRESET, PROJECT_STATUS_LABELS } from './core/types';

// Hooks
export { useEntityDetail } from './hooks/useEntityDetail';
export type { UseEntityDetailConfig, UseEntityDetailResult } from './hooks/useEntityDetail';

export { useFreelancermapDetail } from './hooks/useFreelancermapDetail';
export type { UseFreelancermapDetailResult } from './hooks/useFreelancermapDetail';

export { useProjectComparison } from './hooks/useProjectComparison';
export type { UseProjectComparisonResult } from './hooks/useProjectComparison';
export type { ComparisonColumn } from '@src/lib/api/aiscopeTypes';

export { useProjectSiblings } from './hooks/useProjectSiblings';
export type { UseProjectSiblingsResult } from './hooks/useProjectSiblings';

export { useFreelancermapTable } from './hooks/useFreelancermapTable';
export type {
  FreelancermapTableRow,
  UseFreelancermapTableResult,
} from './hooks/useFreelancermapTable';

export {
  useProjectTrends,
  rangeOptions,
} from '@src/providers/projectTrends/useProjectTrends';
export type {
  UseProjectTrendsState,
  UseProjectTrendsActions,
  UseProjectTrendsResult,
} from '@src/providers/projectTrends/useProjectTrends';

export { useAdminProjects } from './hooks/useAdminProjects';
export type {
  AdminProjectsActions as AdminProjectsActionsType,
  AdminProjectsState,
  ProjectTableRow,
  UseAdminProjectsResult,
} from './hooks/useAdminProjects';

export { useSkillAnalysis } from './hooks/useSkillAnalysis';
export type {
  SkillAnalysisState,
  SkillAnalysisActions,
  UseSkillAnalysisResult,
  TrendRow,
} from './hooks/useSkillAnalysis';

// Sub-components (consolidated AdminProjects data-table group)
export { default as AdminProjectsActions } from './components/admin-projects-data-table/AdminProjectsActions';

export {
  fetchFreelancermapProjects,
  fetchFreelancermapProject,
  fetchFreelancermapCount,
  runScraper,
  fetchProjects,
  fetchProjectCount,
  fetchProjectById,
  fetchProjectSiblings,
  fetchSlaveCandidates,
  fetchMasterCandidates,
  setProjectCanonical,
  setProjectStatus,
  unlinkFreelancermapEntry,
  switchCanonical,
  fetchChartRadar,
  fetchChartBar,
  fetchChartTrend,
  searchProjects,
} from '@src/lib/api/aiscope';
export type {
  ProjectFreelancerMap,

  Project,
  ScraperRunResult,
  UnlinkResponse,
  SwitchCanonicalResponse,
  SiblingsResponse,
  RadarPoint,
  BarPoint,
  TrendPoint,
  TrendWindow,
} from '@src/lib/api/aiscope';

export {
  getProjectEndcustomerCandidates,
  postConfirmCandidate,
  postRejectCandidate,
  getPipelineResult,
} from '@src/lib/api/aiscopeEndcustomer';
export type {
  ConfirmResult,
  EndcustomerCandidate,
  PipelineActResult,
  PipelineResultResponse,
} from '@src/lib/api/aiscopeEndcustomer';

export { postResearchEndcustomer, postBulkMerge } from '@src/lib/api/aiscopeTasks';

export { useTaskProgress } from '@src/providers/taskProgress/useTaskProgress';
export type { TaskProgress } from '@src/providers/taskProgress/useTaskProgress';

export { useEndcustomerResearch } from './hooks/useEndcustomerResearch';

export { triggerSkillBackfill, recalculateAllScores } from '@src/lib/api/aiscope';

export { default as EndCustomerResearchSection } from './components/endcustomer-research/EndCustomerResearchSection';
