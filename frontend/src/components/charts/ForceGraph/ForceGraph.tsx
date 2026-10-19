import { useCallback, useRef } from 'react';
import ForceGraph2D from 'react-force-graph-2d';

import Skeleton from '@src/components/primitives/Skeleton';
import Text from '@src/components/primitives/Text';

import type { ForceGraphProps } from './ForceGraph.interface';
import type { ForceGraphMethods, GraphData, NodeObject } from 'react-force-graph-2d';

/** Renders a D3 force-directed graph with nodes and links. */
export default function ForceGraph({
  nodes, links, height = 300, onNodeClick, loading, errorMessage,
}: ForceGraphProps) {
  const fgRef = useRef<ForceGraphMethods<Record<string, unknown>, Record<string, unknown>>>(undefined);

  const handleNodeClick = useCallback(
    (node: NodeObject) => {
      onNodeClick?.(node as unknown as ForceGraphProps['nodes'][number]);
      // Zoom to node
      if (node.x != null && node.y != null) {
        fgRef.current?.zoomToFit(400, 50, (n: object) => n === node);
      }
    },
    [onNodeClick],
  );

  if (loading) return <Skeleton size="image" />;
  if (errorMessage) return <Text size="sm" color="error">{errorMessage}</Text>;

  return (
    <ForceGraph2D
      ref={fgRef}
      graphData={{ nodes, links } as GraphData}
      width={600}
      height={height}
      nodeLabel="name"
      nodeVal="val"
      nodeColor="color"
      linkWidth={(link) => ((link as ForceGraphProps['links'][number]).value ?? 1) * 0.5}
      linkDirectionalArrowLength={3}
      linkDirectionalArrowRelPos={1}
      onNodeClick={handleNodeClick}
      cooldownTicks={100}
      enableNodeDrag
      enableZoomInteraction
    />
  );
}

export type { ForceGraphProps } from './ForceGraph.interface';
