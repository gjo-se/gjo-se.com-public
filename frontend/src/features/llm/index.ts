/**
 * LLM Feature – Public API Barrel
 *
 * Exportiert alle öffentlichen Komponenten, Hooks und Services.
 */

// ── Components ─────────────────────────────────────────────────────────────
export { default as LLMModelsTab } from './components/llm-models/LLMModelsTab';
export { default as LLMProvidersTab } from './components/llm-providers/LLMProvidersTab';
export { default as TaskMappingSection } from './components/llm-tasks/TaskMappingSection';
export { default as LangfusePromptLink } from './components/langfuse-prompt-link/LangfusePromptLink';
export { default as TaskEvaluationSection } from './components/task-evaluation/TaskEvaluationSection';
export { default as HyperparameterEditor } from './components/hyperparameter-editor/HyperparameterEditor';
export { default as HyperparameterHelpContent } from './components/hyperparameter-help/HyperparameterHelpContent';

// ── Hooks ──────────────────────────────────────────────────────────────────
export { useLLMModels } from './hooks/useLLMModels';
export { useLLMModelsTable } from './hooks/useLLMModelsTable';
export type { LLMModelTableRow, UseLLMModelsTableResult } from './hooks/useLLMModelsTable';
export { useLLMProviders } from './hooks/useLLMProviders';
export type { UseLLMProvidersResult } from './hooks/useLLMProviders';
export { useLLMTaskMappings } from './hooks/useLLMTaskMappings';
export { useLLMTasks } from './hooks/useLLMTasks';
export type { TaskTableRow, UseLLMTasksResult } from './hooks/useLLMTasks';
export { useLLMTaskDetail } from './hooks/useLLMTaskDetail';
export type { UseLLMTaskDetailResult } from './hooks/useLLMTaskDetail';
export { useLLMCallLogs } from './hooks/useLLMCallLogs';
export type { CallLogTableRow, UseLLMCallLogsResult } from './hooks/useLLMCallLogs';
export { useLLMCallLogStats } from './hooks/useLLMCallLogStats';
export type { CallLogStatsTiles, UseLLMCallLogStatsResult } from './hooks/useLLMCallLogStats';
export { useLLMCallLogsUnread } from './hooks/useLLMCallLogsUnread';
export type { UseLLMCallLogsUnreadResult } from './hooks/useLLMCallLogsUnread';
export { useLLMObservability } from './hooks/useLLMObservability';
export type { UseLLMObservabilityResult } from './hooks/useLLMObservability';
export { useTaskModelConfigs } from './hooks/useTaskModelConfigs';
export type { ModelConfigTableRow, UseTaskModelConfigsResult } from './hooks/useTaskModelConfigs';
export { useJudgeInfo } from './hooks/useJudgeInfo';
export type { JudgeInfo } from './hooks/useJudgeInfo';

// ── Services ───────────────────────────────────────────────────────────────
export { fetchModels, fetchModelById, fetchModelCount, syncLLMModels, patchLLMModelActive } from './services/modelCatalogService';
export type { LLMModelEntry, LLMSyncResult, LLMModelListParams } from './services/modelCatalogService';

export { fetchLLMProviders, fetchAdminLLMProviders } from '@src/lib/api/llmProviders';
export type { LLMProviderStatus, LLMProviderAdmin } from '@src/lib/api/llmProviders';

export { fetchTasks, upsertTaskMapping, setTaskMappingActive } from './services/taskMappingService';
export type { TaskWithMapping, TaskMappingUpsert } from './services/taskMappingService';

export { fetchCallLogs, fetchCallLogStats } from '@src/lib/api/callLog';
export type {
  CallLogOut,
  CallLogStats,
  FetchCallLogsParams,
  LlmCallErrorType,
  ObservabilityConfig,
  RetryBatchResponse,
  TaskProgressResponse,
} from '@src/lib/api/callLog';
export { fetchObservabilityConfig } from '@src/lib/api/callLog';
export { markCallLogsSeen, readCallLogsSeenAt } from './services/callLogSeen';

export { fetchCircuitBreakers, resetCircuitBreaker } from './services/circuitBreakerService';
export type { CircuitBreakerStatus, CircuitBreakerReset } from './services/circuitBreakerService';

export { useCircuitBreakerStatus } from './hooks/useCircuitBreakerStatus';
export type { UseCircuitBreakerStatusResult } from './hooks/useCircuitBreakerStatus';
export { useTaskEvalRuns } from './hooks/useTaskEvalRuns';
export type { UseTaskEvalRunsResult } from './hooks/useTaskEvalRuns';
export { usePromoteToDataset } from '@src/providers/datasetPromotion/usePromoteToDataset';
export type { UsePromoteToDatasetResult } from '@src/providers/datasetPromotion/usePromoteToDataset';
export { default as TriggerObserverCard } from './components/trigger-observer-card/TriggerObserverCard';
export { default as PipelineTestSection } from './components/pipeline-test-section/PipelineTestSection';

export { usePipelineTest, ACT_OPTIONS } from './hooks/usePipelineTest';
export type { UsePipelineTestDeps, UsePipelineTestResult } from './hooks/usePipelineTest';

export { fetchTaskTriggers, fetchTaskExamples } from './services/triggerObserverService';
export type {
  TriggerObservation,
  TriggerStatsResponse,
  TaskExamplesResponse,
} from './services/triggerObserverService';

export { fetchModelConfigs, createModelConfig, updateModelConfig, deleteModelConfig } from './services/modelConfigService';
export type { ModelConfigRow, ModelConfigCreate, ModelConfigUpdate } from './services/modelConfigService';
