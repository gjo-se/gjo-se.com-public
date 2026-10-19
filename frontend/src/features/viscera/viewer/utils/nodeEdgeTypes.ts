
import Edge from '../components/edges/Edge';
import CardNode from '../components/nodes/CardNode';
import FileNode from '../components/nodes/FileNode';
import GroupNode from '../components/nodes/GroupNode';
import SqlTableNode from '../components/nodes/SqlTableNode';

import type { NodeTypes, EdgeTypes } from '@xyflow/react';

export const NODE_TYPES = {
  systemCard: CardNode,
  personCard: CardNode,
  containerCard: CardNode,
  group: GroupNode,
  file: FileNode,
  sqlTableCard: SqlTableNode,
} as const satisfies NodeTypes;

export const EDGE_TYPES = {
  edge: Edge,
} as const satisfies EdgeTypes;
