/**
 * Application Feature barrel – Public API.
 *
 * Re-exports the API service and types plus the flow hook and components so
 * consumers import from the feature root rather than deep paths.
 */

// Service
export {
  createSubmissionCommunication,
  deleteSubmission,
  deleteSubmissionCommunication,
  fetchSubmissionApplications,
  fetchSubmissionCount,
  fetchSubmissions,
  getApplicationDocumentBlob,
  getGeneralCvBlob,
  getSubmission,
  getSubmissionByProject,
  prepareSubmission,
  sendSubmission,
  setCurrentSubmission,
  updateSubmissionCommunication,
  updateSubmissionStatus,
} from './services/applicationService';

// Score Service
export {
  fetchLatestScoreByProject,
  fetchLatestScoreBySubmission,
  fetchScoreHistory,
  fetchScoreRun,
  startScoreRun,
} from './services/applicationScoreService';

// Types
export type {
  ApplicationCommunicationCreate,
  ApplicationCommunicationOut,
  ApplicationCommunicationUpdate,
  ApplicationDocumentOut,
  ApplicationStatusOut,
  ApplicationSubmissionDetailOut,
  ApplicationSubmissionListOut,
} from './services/applicationService';
export type {
  ApplicationScoreCriterionOut,
  ApplicationScoreGroupOut,
  ApplicationScoreRequirement,
  ApplicationScoreRunOut,
  ApplicationScoreStartBody,
  ScoreVerdict,
} from './services/applicationScoreService';

// Score Labels
export {
  CRITERION_LABELS,
  CRITERION_ORDER,
  criterionLabel,
  GROUP_LABELS,
  VERDICT_LABELS,
} from './shared/applicationScoreLabels';

// Hooks
export { useApplicationFlow } from './hooks/useApplicationFlow';
export type { UseApplicationFlowResult } from './hooks/useApplicationFlow';
export { useSubmissionTable } from './hooks/useSubmissionTable';
export type { SubmissionTableRow, UseSubmissionTableResult } from './hooks/useSubmissionTable';
export { useSubmissionDetail } from './hooks/useSubmissionDetail';
export type { UseSubmissionDetailResult } from './hooks/useSubmissionDetail';
export { useSubmissionScores } from './hooks/useSubmissionScores';
export type { UseSubmissionScoresResult } from './hooks/useSubmissionScores';

// Components
export { default as ApplicationReviewDialog } from './components/application-review-dialog/ApplicationReviewDialog';
export type { ApplicationReviewDialogProps } from './components/application-review-dialog/ApplicationReviewDialog';
export { default as ApplicationHistory } from './components/application-history/ApplicationHistory';
export type { ApplicationHistoryProps } from './components/application-history/ApplicationHistory';
export { default as ApplicationTimeline } from './components/application-timeline/ApplicationTimeline';
export type { ApplicationTimelineProps } from './components/application-timeline/ApplicationTimeline';
export { default as GeneralCvDialog } from './components/general-cv-dialog/GeneralCvDialog';
export type { GeneralCvDialogProps } from './components/general-cv-dialog/GeneralCvDialog';
export { default as CommunicationFormDialog } from './components/communication-form-dialog/CommunicationFormDialog';
export type { CommunicationFormDialogProps } from './components/communication-form-dialog/CommunicationFormDialog';
export { default as ScoreHistory } from './components/score-history/ScoreHistory';
export type { ScoreHistoryProps } from './components/score-history/ScoreHistory';
