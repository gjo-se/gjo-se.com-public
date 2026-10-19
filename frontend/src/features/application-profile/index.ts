/**
 * Application Profile Feature barrel – Public API.
 *
 * Re-exports the API service and types so consumers import from
 * the feature root rather than deep paths.
 */

// Service
export { getApplicationProfileStreamUrl } from '@src/lib/api/applicationProfileStream';
export {
  createCareerEntry,
  createExperience,
  createFocusArea,
  deleteCareerEntry,
  deleteExperience,
  deleteFocusArea,
  getProfile,
  getPublicProfile,
  listApplicationProfileAssets,
  listCareerEntries,
  listExperiences,
  listFocusAreas,
  reorderCareerEntries,
  reorderExperiences,
  reorderFocusAreas,
  updateCareerEntry,
  updateExperience,
  updateFocusArea,
  uploadProfilePhoto,
  upsertProfile,
} from '@src/lib/api/applicationProfile';

// Types
export type {
  ApplicationProfileCreate,
  ApplicationProfileLocaleFields,
  ApplicationProfileOut,
  ApplicationProfilePublicOut,
  ApplicationProfilePublicResponse,
  CareerEntryCreate,
  CareerEntryOut,
  CareerEntryUpdate,
  CareerLocaleFields,
  DecisionLocaleFields,
  ExperienceCreate,
  ExperienceDecision,
  ExperienceDecisionInput,
  ExperienceLocaleFields,
  ExperienceOut,
  ExperienceProof,
  ExperienceProofInput,
  ExperienceUpdate,
  FocusAreaCreate,
  FocusAreaLocaleFields,
  FocusAreaOut,
  FocusAreaUpdate,
  ProofLocaleFields,
  SkillPublicOut,
} from '@src/lib/api/applicationProfile';

// Hooks
export { useProfileDetail } from './hooks/useProfileDetail';
export type { UseProfileDetailResult } from './hooks/useProfileDetail';
export { useCareerEntryTable } from './hooks/useCareerEntryTable';
export type { UseCareerEntryTableResult } from './hooks/useCareerEntryTable';
export type { CareerRow } from './hooks/useCareerEntryTable';
export { useExperienceTable } from './hooks/useExperienceTable';
export type { UseExperienceTableResult } from './hooks/useExperienceTable';
export { useFocusAreaTable } from './hooks/useFocusAreaTable';
export type { UseFocusAreaTableResult } from './hooks/useFocusAreaTable';
export type { FocusAreaRow } from './hooks/useFocusAreaTable';

// Components
export { default as CareerEntryTable } from './components/career-entry-table/CareerEntryTable';
export { default as ExperienceDialog } from './components/experience-dialog/ExperienceDialog';
export type { ExperienceDialogProps } from './components/experience-dialog/ExperienceDialog';
export { default as ExperienceTable } from './components/experience-table/ExperienceTable';
export { default as FocusAreaTable } from './components/focus-area-table/FocusAreaTable';
export { default as ProfilePhotoRow } from './components/profile-photo-row/ProfilePhotoRow';
export type { ProfilePhotoRowProps } from './components/profile-photo-row/ProfilePhotoRow';
export { default as StoryFocusRow } from '@src/components/molecules/InlineMarkdownEditRow/InlineMarkdownEditRow';
export type { InlineMarkdownEditRowProps as StoryFocusRowProps } from '@src/components/molecules/InlineMarkdownEditRow/InlineMarkdownEditRow';
