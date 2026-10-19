import FlowPlayer from './FlowPlayer';

import type { Flow } from '../../../core/workspaceSchema';
import type { UseFlowResult } from '../../../hooks/useFlow';

export interface FlowPlayerSectionProps {
  flows: Flow[];
  activeFlow: Flow | null;
  onSelectFlow: (id: string | null) => void;
  flowControls: UseFlowResult;
  getParentFlows: (id: string) => Flow[];
  getSubFlows: (id: string) => Flow[];
}

/** Extracted Flow-Player integration block for composition in VisceraViewsPage. */
export default function FlowPlayerSection({
  flows,
  activeFlow,
  onSelectFlow,
  flowControls,
  getParentFlows,
  getSubFlows,
}: FlowPlayerSectionProps) {
  return (
    <div style={{ marginTop: 8 }}>
      <FlowPlayer
        flows={flows}
        activeFlow={activeFlow}
        onSelectFlow={onSelectFlow}
        flowControls={flowControls}
        getParentFlows={getParentFlows}
        getSubFlows={getSubFlows}
      />
    </div>
  );
}
