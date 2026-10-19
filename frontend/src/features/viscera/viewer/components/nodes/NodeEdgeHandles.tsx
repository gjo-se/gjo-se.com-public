import { Handle, Position } from '@xyflow/react';

/**
 * Standard source/target edge handles for L4 module nodes and ER tables.
 *
 * Both node kinds need byte-identical handles so straight import/FK edges can
 * attach. `CardNode` keeps its own layout-aware variant (direction + size).
 */
export default function NodeEdgeHandles() {
  return (
    <>
      <Handle
        type="source"
        position={Position.Right}
        id="source-right"
        isConnectable
        style={{ width: 8, height: 8, background: '#6366f1', border: '2px solid #fff' }}
      />
      <Handle
        type="target"
        position={Position.Left}
        id="target-left"
        isConnectable
        style={{ width: 8, height: 8, background: '#6366f1', border: '2px solid #fff' }}
      />
    </>
  );
}
