import { ReactFlowProvider } from '@xyflow/react';

import VisceraReactFlow from '../../../viewer/VisceraReactFlow';

import type { FlowStep } from '../../../core/workspaceSchema';

export interface FlowHighlighterProps {
  /**
   * The active flow step whose from/to edge should be highlighted.
   * When null or undefined, the diagram renders without flow highlights.
   */
  activeFlowStep?: FlowStep | null;
}

/**
 * Renders the diagram with flow step highlighting.
 *
 * When an active flow step is provided, the edge line between
 * `step.from` and `step.to` will be highlighted in accent color.
 */
export default function FlowHighlighter({ activeFlowStep }: FlowHighlighterProps) {
  return (
    <ReactFlowProvider>
      <VisceraReactFlow
        currentViewKey="SystemContext"
        onViewKeyChange={() => {}}
        activeFlowStep={activeFlowStep}
      />
    </ReactFlowProvider>
  );
}
