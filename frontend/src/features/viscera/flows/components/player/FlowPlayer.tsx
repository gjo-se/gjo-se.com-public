import FlowDropdown from './FlowDropdown';
import FlowPlaybackControls from './FlowPlaybackControls';

import type { Flow } from '../../../core/workspaceSchema';
import type { UseFlowResult } from '../../../hooks/useFlow';

export interface FlowPlayerProps {
  /** All available flows from the workspace. */
  flows: Flow[];
  /** The currently selected flow, or null. */
  activeFlow: Flow | null;
  /** Select a flow by ID. Pass null to deselect. */
  onSelectFlow: (id: string | null) => void;
  /** Flow playback controls from useFlow(). */
  flowControls: UseFlowResult;
  /** Find flows that reference the given flow as a parent. */
  getParentFlows: (flowId: string) => Flow[];
  /** Find subflows for the given flow. */
  getSubFlows: (flowId: string) => Flow[];
}

/**
 * Flow Player toolbar: custom dropdown with step preview, parent/subflow
 * navigation, playback controls, and step indicator.
 *
 * Renders at the top of the flows page above the diagram.
 */
export default function FlowPlayer({
  flows,
  activeFlow,
  onSelectFlow,
  flowControls,
  getParentFlows,
  getSubFlows,
}: FlowPlayerProps) {
  const { activeStepIndex, stepCount, isPlaying, play, pause, next, prev, goToStep } =
    flowControls;

  const hasFlow = activeFlow !== null;
  const hasSteps = stepCount > 0;

  return (
    <section className="mb-4 flex flex-wrap items-center gap-3 rounded-lg border bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-900">
      {/* Flow selector dropdown */}
      <FlowDropdown
        flows={flows}
        activeFlow={activeFlow}
        onSelectFlow={onSelectFlow}
        goToStep={goToStep}
        activeStepIndex={activeStepIndex}
        getParentFlows={getParentFlows}
        getSubFlows={getSubFlows}
      />

      {/* Playback controls (only visible when a flow with steps is selected) */}
      {hasFlow && (
        <FlowPlaybackControls
          activeStepIndex={activeStepIndex}
          stepCount={stepCount}
          isPlaying={isPlaying}
          hasSteps={hasSteps}
          activeStepLabel={flowControls.activeStep?.label}
          onPlay={play}
          onPause={pause}
          onPrev={prev}
          onNext={next}
        />
      )}
    </section>
  );
}
