/**
 * Viscera – Public API Barrel
 *
 * Re-export von Schema + Types + Hooks für alle weiteren Increments.
 */

export {
  adrFrontmatterSchema,
  adrStatusSchema,
  annotationSchema,
  flowSchema,
  flowSpecSchema,
  flowStepSchema,
  layoutMapSchema,
  modelObjectTypeSchema,
  edgeSchema,
  stepTypeSchema,
  styleSchema,
  tagValues,
  viewLayoutSchema,
  viewTypeSchema,
  workspaceSchema,
} from './core/workspaceSchema';

export { useWorkspace } from './core/useWorkspace';
export type { UseWorkspaceResult } from './core/useWorkspace';

export { useFlows } from './hooks/useFlows';
export type { UseFlowsResult } from './hooks/useFlows';

export { useFlow } from './hooks/useFlow';
export type { UseFlowResult } from './hooks/useFlow';

export { WorkspaceProvider } from './shared/WorkspaceProvider';
export type { WorkspaceProviderProps } from './shared/WorkspaceProvider';

export { useEntityCache, invalidateEntityCache } from './core/useEntityCache';
export type { EntityData, EntityType, UseEntityCacheResult } from './core/useEntityCache';

export { useChildDiagrams, deriveChildDiagrams } from './core/useChildDiagrams';

export { useViewState } from './hooks/useViewState';
export type { UseViewStateResult } from './hooks/useViewState';

export { useRestoreLastUrl } from './hooks/useRestoreLastUrl';

export { useFileTraceability } from './hooks/useFileTraceability';
export type { FileLink, UseFileTraceabilityOptions } from './hooks/useFileTraceability';

export { useShortcuts } from './core/useShortcuts';
export type { Shortcut } from './core/useShortcuts';

export { default as ExportButton } from './shared/ExportButton';
export type { ExportButtonProps } from './shared/ExportButton';
export { default as FullscreenToggle } from './shared/FullscreenToggle';
export type { FullscreenToggleProps } from './shared/FullscreenToggle';
export { default as ShortcutHints } from './shared/ShortcutHints';
export type { ShortcutHintsProps } from './shared/ShortcutHints';
export { default as VSCodeLink } from './shared/VSCodeLink';

export { default as VisceraReactFlow } from './viewer/VisceraReactFlow';
export { default as Breadcrumb } from './viewer/components/misc/Breadcrumb';
export { DependenciesView } from './viewer/components/misc/DependenciesView';
export { default as DiagramsDropdown } from './viewer/components/misc/DiagramsDropdown';
export { default as DetailDiagramViewer } from './viewer/components/misc/DetailDiagramViewer';
export { EditableField } from './viewer/components/field/EditableField';
export { default as FreshnessBadge } from './viewer/components/badge/FreshnessBadge';
export { ObjectDetailsPanel } from './viewer/components/panel/ObjectDetailsPanel';
export { default as PerspectiveBar } from './viewer/components/panel/PerspectiveBar';
export { computeFilteredNodeIds } from './viewer/utils/computeFilteredNodeIds';
export { useFreshnessCheck } from './viewer/hooks/useFreshnessCheck';
export { useObjectDetail } from './viewer/hooks/useObjectDetail';
export { usePerspectiveState } from './viewer/hooks/usePerspectiveState';
export { useBulkValidation, applyFieldEdit } from './viewer/hooks/useBulkValidation';
export { useYamlWrite } from './viewer/hooks/useYamlWrite';
export { useGitHistory } from './viewer/hooks/useGitHistory';
export { default as Toolbar } from './viewer/Toolbar';
export { default as DiagramViewer } from './viewer/DiagramViewer';
export { default as ModuleSigmaView } from './viewer/components/sigma/ModuleSigmaView';
export { useKeyboardShortcuts, KEYBOARD_SHORTCUTS } from './viewer/hooks/useKeyboardShortcuts';
export { useViewerActions } from './viewer/hooks/useViewerActions';

export type { VisceraReactFlowProps } from './viewer/VisceraReactFlow';
export type { DependenciesViewProps } from './viewer/components/misc/DependenciesView';
export type { DiagramsDropdownProps } from './viewer/components/misc/DiagramsDropdown';
export type { EditableFieldProps } from './viewer/components/field/EditableField';
export type { FilteredNodeIds } from './viewer/utils/computeFilteredNodeIds';
export type { FreshnessResult } from './viewer/hooks/useFreshnessCheck';
export type { ObjectDetailsPanelProps } from './viewer/components/panel/ObjectDetailsPanel';
export type { PerspectiveBarProps } from './viewer/components/panel/PerspectiveBar';
export type { ObjectDetail, DetailField, ObjectType } from './viewer/hooks/useObjectDetail';
export type {
  BadgeState,
  BadgeToggleState,
  PerspectiveState,
  UsePerspectiveStateResult,
} from './viewer/hooks/usePerspectiveState';
export type { ValidationError, BulkValidationResult } from './viewer/hooks/useBulkValidation';
export type { WriteResult } from './viewer/hooks/useYamlWrite';
export type { CommitInfo, UseGitHistoryResult } from './viewer/hooks/useGitHistory';
export type { ToolbarProps } from './viewer/Toolbar';
export type { DiagramViewerProps } from './viewer/DiagramViewer';

export { default as LivePreview } from './editor/components/editor/LivePreview';
export { default as YamlEditor } from './editor/components/editor/YamlEditor';
export { useYamlValidation } from './editor/hooks/useYamlValidation';

export { default as AdrTable } from './adrs/components/adr/AdrTable';
export { default as AdrToolbar } from './adrs/components/adr/AdrToolbar';
export { default as AdrEditor } from './adrs/components/adr/AdrEditor';
export { default as AdrStatusBadge } from './adrs/components/adr/AdrStatusBadge';
export { default as AdrSystemsBadges } from './adrs/components/adr/AdrSystemsBadges';
export { default as AdrTagsBadges } from './adrs/components/adr/AdrTagsBadges';
export { useAdrs } from './adrs/hooks/useAdrs';
export { useSplitResize } from './adrs/hooks/useSplitResize';
export type { Adr, UseAdrsResult } from './adrs/hooks/useAdrs';

export { default as FlowPlayer } from './flows/components/player/FlowPlayer';
export { default as FlowPlayerSection } from './flows/components/player/FlowPlayerSection';
export { default as FlowHighlighter } from './flows/components/player/FlowHighlighter';
export { default as FlowStepList } from './flows/components/player/FlowStepList';
export { default as SpecTable } from './flows/components/player/SpecTable';
export type { FlowPlayerProps } from './flows/components/player/FlowPlayer';
export type { FlowPlayerSectionProps } from './flows/components/player/FlowPlayerSection';
export type { FlowHighlighterProps } from './flows/components/player/FlowHighlighter';
export type { FlowStepListProps } from './flows/components/player/FlowStepList';
export type { SpecTableProps } from './flows/components/player/SpecTable';

export { useScanCode } from './viewer/hooks/useScanCode';
export { default as ScanCodeToast } from './viewer/components/dialog/ScanCodeToast';
export type { ScanCodeState, UseScanCodeReturn, Activity, ScanResult } from './viewer/hooks/useScanCode';
export type { ScanCodeToastProps } from './viewer/components/dialog/ScanCodeToast';

export { default as CommandPalette } from './search/components/palette/CommandPalette';
export { useSearch } from './search/hooks/useSearch';
export type { SearchResult, UseSearchResult } from './search/hooks/useSearch';

export { useModelExplorer } from './explorer/hooks/useModelExplorer';
export type { ModelObject, UseModelExplorerResult } from './explorer/hooks/useModelExplorer';

export { default as ModelTree } from './explorer/components/model/ModelTree';
export type { ModelTreeProps } from './explorer/components/model/ModelTree';

export { default as ModelViewer } from './explorer/components/model/ModelViewer';
export type {
  NormalizedModelObject,
  EdgeLine,
  ModelViewerProps,
} from './explorer/components/model/ModelViewer';

export { useModules } from './hooks/useModules';
export type { UseModulesResult } from './hooks/useModules';

export { useVisceraStore } from './store/visceraStore';

export { default as AssignToDiagramDialog } from './viewer/components/dialog/AssignToDiagramDialog';
export { default as CreateDiagramDialog } from './viewer/components/dialog/CreateDiagramDialog';
export { default as CreateObjectDialog } from './viewer/components/dialog/CreateObjectDialog';
export { useSyncService } from './viewer/hooks/useSyncService';

export {
  useModelExplorerSearch,
  TYPE_FILTER_OPTIONS,
  PARENT_FILTER_OPTIONS,
} from './explorer/hooks/useModelExplorerSearch';
export type { ParentFilterValue } from './explorer/hooks/useModelExplorerSearch';

export { default as useModelViewer } from './explorer/hooks/useModelViewer';
export type { UseModelViewerResult } from './explorer/hooks/useModelViewer';

export type {
  AdrFrontmatter,
  AdrStatus,
  Annotation,
  ArchitectureObject,
  ChildDiagram,
  Diagram,
  Flow,
  FlowSpec,
  FlowStep,
  LayoutMap,
  ModelObjectType,
  Person,
  Edge,
  StepType,
  Style,
  System,
  ViewLayout,
  ViewType,
  Workspace,
  WorkspaceFile,
} from './core/workspaceTypes';
