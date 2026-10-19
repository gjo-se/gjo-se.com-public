/**
 * Tests: nodeEdgeTypes
 *
 * Verifies the ReactFlow node-type registry: every expected diagram type is
 * registered, the shared CardNode serves all card kinds, and the group/file/
 * table slots resolve to their dedicated components.
 */

import { describe, expect, it } from 'vitest';

import Edge from '@src/features/viscera/viewer/components/edges/Edge';
import CardNode from '@src/features/viscera/viewer/components/nodes/CardNode';
import FileNode from '@src/features/viscera/viewer/components/nodes/FileNode';
import GroupNode from '@src/features/viscera/viewer/components/nodes/GroupNode';
import SqlTableNode from '@src/features/viscera/viewer/components/nodes/SqlTableNode';
import { EDGE_TYPES, NODE_TYPES } from '@src/features/viscera/viewer/utils/nodeEdgeTypes';

describe('NODE_TYPES', () => {
  it('registriert genau die erwarteten Node-Typen', () => {
    expect(Object.keys(NODE_TYPES).sort()).toEqual([
      'containerCard',
      'file',
      'group',
      'personCard',
      'sqlTableCard',
      'systemCard',
    ]);
  });

  it('nutzt für alle Card-Varianten dieselbe CardNode-Komponente', () => {
    expect(NODE_TYPES.systemCard).toBe(CardNode);
    expect(NODE_TYPES.personCard).toBe(CardNode);
    expect(NODE_TYPES.containerCard).toBe(CardNode);
  });

  it('nutzt die dedizierten Komponenten für group, file und table', () => {
    expect(NODE_TYPES.group).toBe(GroupNode);
    expect(NODE_TYPES.file).toBe(FileNode);
    expect(NODE_TYPES.sqlTableCard).toBe(SqlTableNode);
  });
});

describe('EDGE_TYPES', () => {
  it('registriert die Edge-Komponente unter dem Kantentyp edge', () => {
    expect(Object.keys(EDGE_TYPES)).toEqual(['edge']);
    expect(EDGE_TYPES.edge).toBe(Edge);
  });
});
