/**
 * Tests: diagramSlice
 *
 * Behaviour of node/edge mutations, transient-node preservation, per-diagram
 * override cleanup, sync-queue normalization and the field-level mutations
 * including their validation error paths.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useVisceraStore } from '@src/features/viscera/store/visceraStore';

import { resetVisceraStore } from '../helpers';

import type { DiagramNode, SyncQueueEntry } from '@src/features/viscera/store/diagramSlice';
import type { SyncAction } from '@src/features/viscera/store/diagramSliceTypes';

const store = () => useVisceraStore.getState();

function queueEntry(
  mutationId: string,
  nodeId: string,
  action: SyncAction = 'create',
): SyncQueueEntry {
  return { mutationId, nodeId, action, payload: {}, retryCount: 0, status: 'pending' };
}

function node(id: string, patch: Partial<DiagramNode> = {}): DiagramNode {
  return {
    id,
    type: 'containerCard',
    data: { name: id },
    position: { x: 0, y: 0 },
    isTransient: false,
    ...patch,
  };
}

beforeEach(() => {
  resetVisceraStore();
});

describe('diagramSlice – nodes', () => {
  it('replaces nodes but keeps orphaned transient nodes', () => {
    store().addNode(node('tmp', { isTransient: true }));
    store().setNodes([node('persisted')]);

    expect(store().nodes.map((n) => n.id)).toEqual(['persisted', 'tmp']);
  });

  it('drops non-transient nodes that are missing from the incoming set', () => {
    store().setNodes([node('old')]);

    store().setNodes([node('new')]);

    expect(store().nodes.map((n) => n.id)).toEqual(['new']);
  });

  it('adds new nodes as transient', () => {
    store().addNode(node('api', { isTransient: false }));

    expect(store().nodes[0]?.isTransient).toBe(true);
  });

  it('clears the transient flag once persisted', () => {
    store().addNode(node('api'));

    store().clearTransient('api');

    expect(store().nodes[0]?.isTransient).toBe(false);
  });

  it('updates node data for an existing node only', () => {
    store().setNodes([node('api', { data: { name: 'API' } })]);

    store().updateNode('api', { name: 'Gateway' });
    store().updateNode('missing', { name: 'Ignored' });

    expect(store().nodes).toHaveLength(1);
    expect(store().nodes[0]?.data).toEqual({ name: 'Gateway' });
  });
});

describe('diagramSlice – deleteNode', () => {
  it('removes the node, its per-diagram overrides and its queue entries', () => {
    store().setNodes([node('api'), node('db')]);
    store().setNodeOverride('view:api', { x: 1, y: 2 });
    store().setNodeOverride('view:db', { x: 3, y: 4 });
    store().queueSync(queueEntry('m1', 'api'));
    store().queueSync(queueEntry('m2', 'db'));

    store().deleteNode('api');

    expect(store().nodes.map((n) => n.id)).toEqual(['db']);
    expect(store().nodeOverrides).toEqual({ 'view:db': { x: 3, y: 4 } });
    expect(store().syncQueue.map((e) => e.mutationId)).toEqual(['m2']);
  });

  it('does not remove a different node whose id merely ends with the deleted id', () => {
    store().setNodeOverride('view:myapi', { x: 1, y: 1 });

    store().deleteNode('api');

    expect(store().nodeOverrides).toEqual({ 'view:myapi': { x: 1, y: 1 } });
  });
});

describe('diagramSlice – edges', () => {
  it('adds an edge and removes it together with its queue entries', () => {
    store().addEdge({ id: 'api__db', source: 'api', target: 'db' });
    store().queueSync(queueEntry('m1', 'api__db', 'create_edge'));

    expect(store().edges).toHaveLength(1);

    store().deleteEdge('api__db');

    expect(store().edges).toEqual([]);
    expect(store().syncQueue).toEqual([]);
  });

  it('replaces the edge list via setEdges', () => {
    store().setEdges([{ id: 'a__b', source: 'a', target: 'b' }]);

    expect(store().edges).toEqual([{ id: 'a__b', source: 'a', target: 'b' }]);
  });
});

describe('diagramSlice – moveNode', () => {
  it('updates the node position, stores the per-diagram override and queues a move', () => {
    store().setNodes([node('api')]);

    store().moveNode('api', { x: 40, y: 60 }, 'container-app');

    expect(store().nodes[0]?.position).toEqual({ x: 40, y: 60 });
    expect(store().nodeOverrides['container-app:api']).toEqual({ x: 40, y: 60 });
    expect(store().syncQueue).toHaveLength(1);
    expect(store().syncQueue[0]).toMatchObject({
      nodeId: 'api',
      action: 'move',
      payload: { x: 40, y: 60, diagramKey: 'container-app' },
      status: 'pending',
      retryCount: 0,
    });
    expect(store().syncQueue[0]?.payload).not.toHaveProperty('width');
  });

  it('includes group bounds in both the override and the move payload', () => {
    store().setNodes([node('grp', { type: 'group' })]);

    store().moveNode('grp', { x: 10, y: 20 }, 'view', { width: 400, height: 300 });

    expect(store().nodeOverrides['view:grp']).toEqual({
      x: 10,
      y: 20,
      width: 400,
      height: 300,
    });
    expect(store().syncQueue[0]?.payload).toMatchObject({ width: 400, height: 300 });
  });

  it('still queues the move when the node is not on the canvas', () => {
    store().moveNode('ghost', { x: 5, y: 5 }, 'view');

    expect(store().syncQueue).toHaveLength(1);
    expect(store().nodeOverrides['view:ghost']).toEqual({ x: 5, y: 5 });
  });
});

describe('diagramSlice – sync queue', () => {
  it('normalizes queued entries to pending / retryCount 0', () => {
    store().queueSync({
      mutationId: 'm1',
      nodeId: 'api',
      action: 'create',
      payload: { id: 'api' },
      retryCount: 3,
      status: 'failed',
    });

    expect(store().syncQueue[0]).toMatchObject({ retryCount: 0, status: 'pending' });
  });

  it('removes an entry by mutation id', () => {
    store().queueSync(queueEntry('m1', 'api'));
    store().queueSync(queueEntry('m2', 'db'));

    store().removeFromQueue('m1');

    expect(store().syncQueue.map((e) => e.mutationId)).toEqual(['m2']);
  });

  it('patches retry count, status and error of an entry', () => {
    store().queueSync(queueEntry('m1', 'api'));

    store().updateSyncEntry('m1', { retryCount: 2, status: 'retrying', error: 'timeout' });

    expect(store().syncQueue[0]).toMatchObject({
      retryCount: 2,
      status: 'retrying',
      error: 'timeout',
    });
  });

  it('leaves fields untouched when the patch omits them', () => {
    store().queueSync(queueEntry('m1', 'api'));
    store().updateSyncEntry('m1', { retryCount: 2, status: 'retrying' });

    store().updateSyncEntry('m1', { retryCount: undefined });

    expect(store().syncQueue[0]).toMatchObject({ retryCount: 2, status: 'retrying' });
  });

  it('ignores a patch for an unknown mutation id', () => {
    store().updateSyncEntry('missing', { status: 'failed' });

    expect(store().syncQueue).toEqual([]);
  });
});

describe('diagramSlice – field-level mutations', () => {
  it('updates a valid status and queues status_change', () => {
    store().setNodes([node('api', { data: {} })]);

    store().updateNodeStatus('api', 'viscera-approved');

    expect(store().nodes[0]?.data.status).toBe('viscera-approved');
    expect(store().syncQueue[0]).toMatchObject({
      action: 'status_change',
      payload: { status: 'viscera-approved' },
    });
  });

  it('rejects a non-string status without touching state or queue', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    store().setNodes([node('api', { data: {} })]);

    store().updateNodeStatus('api', 42 as unknown as string);

    expect(store().nodes[0]?.data.status).toBeUndefined();
    expect(store().syncQueue).toEqual([]);
    expect(warn).toHaveBeenCalledOnce();
    warn.mockRestore();
  });

  it('accepts non-empty tag slugs and queues tags_change', () => {
    store().setNodes([node('api', { data: {} })]);

    store().updateNodeTags('api', ['risk-high', 'core']);

    expect(store().nodes[0]?.data.tags).toEqual(['risk-high', 'core']);
    expect(store().syncQueue[0]?.action).toBe('tags_change');
  });

  it('rejects tags containing an empty slug (boundary)', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    store().setNodes([node('api', { data: {} })]);

    store().updateNodeTags('api', ['']);

    expect(store().nodes[0]?.data.tags).toBeUndefined();
    expect(store().syncQueue).toEqual([]);
    expect(warn).toHaveBeenCalledOnce();
    warn.mockRestore();
  });

  it('accepts technologies and queues tech_change', () => {
    store().setNodes([node('api', { data: {} })]);

    store().updateNodeTechnologies('api', ['postgres']);

    expect(store().nodes[0]?.data.technologies).toEqual(['postgres']);
    expect(store().syncQueue[0]?.action).toBe('tech_change');
  });

  it('rejects technologies containing an empty slug', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    store().setNodes([node('api', { data: {} })]);

    store().updateNodeTechnologies('api', ['']);

    expect(store().syncQueue).toEqual([]);
    warn.mockRestore();
  });

  it('updates an arbitrary field and queues field_update', () => {
    store().setNodes([node('api', { data: {} })]);

    store().updateNodeField('api', 'description', 'Handles traffic');

    expect(store().nodes[0]?.data.description).toBe('Handles traffic');
    expect(store().syncQueue[0]).toMatchObject({
      action: 'field_update',
      payload: { field: 'description', value: 'Handles traffic' },
    });
  });

  it('ignores field mutations on an unknown node', () => {
    store().updateNodeStatus('missing', 'viscera-approved');
    store().updateNodeTags('missing', ['x']);
    store().updateNodeField('missing', 'description', 'x');

    expect(store().syncQueue).toEqual([]);
  });
});

describe('diagramSlice – annotations', () => {
  it('adds an annotation with author and ISO date', () => {
    store().setNodes([node('api', { data: {} })]);

    store().addAnnotation('api', 'Needs review', 'Greg');

    const annotations = store().nodes[0]?.data.annotations as { text: string; author: string; date: string }[];
    expect(annotations).toHaveLength(1);
    expect(annotations[0]).toMatchObject({ text: 'Needs review', author: 'Greg' });
    expect(annotations[0]?.date).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(store().syncQueue[0]?.action).toBe('annotation_add');
  });

  it('updates an annotation at a valid index', () => {
    store().setNodes([
      node('api', {
        data: { annotations: [{ text: 'old', author: 'A', date: '2026-01-01T00:00:00Z' }] },
      }),
    ]);

    store().updateAnnotation('api', 0, 'new');

    expect(store().nodes[0]?.data.annotations).toEqual([
      { text: 'new', author: 'A', date: '2026-01-01T00:00:00Z' },
    ]);
  });

  it('ignores an out-of-range annotation index', () => {
    store().setNodes([node('api', { data: { annotations: [] } })]);

    store().updateAnnotation('api', 0, 'new');
    store().deleteAnnotation('api', 5);

    expect(store().syncQueue).toEqual([]);
  });

  it('deletes an annotation at a valid index', () => {
    store().setNodes([
      node('api', {
        data: {
          annotations: [
            { text: 'a', author: 'A', date: '2026-01-01T00:00:00Z' },
            { text: 'b', author: 'B', date: '2026-01-02T00:00:00Z' },
          ],
        },
      }),
    ]);

    store().deleteAnnotation('api', 0);

    expect(store().nodes[0]?.data.annotations).toEqual([
      { text: 'b', author: 'B', date: '2026-01-02T00:00:00Z' },
    ]);
    expect(store().syncQueue[0]?.action).toBe('annotation_delete');
  });
});

describe('diagramSlice – diagram-level mutations', () => {
  it('queues a persist_layout entry with the positions', () => {
    store().persistLayout('view', { api: { x: 0, y: 0 } });

    expect(store().syncQueue[0]).toMatchObject({
      nodeId: 'view',
      action: 'persist_layout',
      payload: { diagramKey: 'view', nodes: { api: { x: 0, y: 0 } } },
    });
  });

  it('queues a metadata update', () => {
    store().updateDiagram('view', { name: 'New name' });

    expect(store().syncQueue[0]).toMatchObject({
      action: 'update_diagram',
      payload: { key: 'view', name: 'New name' },
    });
  });

  it('accepts a valid diagram status and rejects an unknown one', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    store().updateDiagramStatus('view', 'viscera-approved');
    store().updateDiagramStatus('view', 'approved');

    expect(store().syncQueue).toHaveLength(1);
    expect(store().syncQueue[0]?.payload).toEqual({
      key: 'view',
      status: 'viscera-approved',
    });
    expect(warn).toHaveBeenCalledOnce();
    warn.mockRestore();
  });

  it('queues a diagram deletion', () => {
    store().deleteDiagram('view');

    expect(store().syncQueue[0]).toMatchObject({
      nodeId: 'view',
      action: 'delete_diagram',
      payload: {},
    });
  });
});
