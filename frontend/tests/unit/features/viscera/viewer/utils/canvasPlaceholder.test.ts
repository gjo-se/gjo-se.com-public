/**
 * Tests: canvasPlaceholder
 *
 * Verifies the editing placeholder CardNode built by both canvas hooks:
 * registry-based node type/label, confirm (persist + remap id + callback),
 * error path when persistence fails or is not wired, and cancel cleanup.
 */

import { describe, expect, it, vi } from 'vitest';

import { CARD } from '@src/features/viscera/core/nodeDimensions';
import { buildPlaceholderNode } from '@src/features/viscera/viewer/utils/canvasPlaceholder';

import type { Node } from '@xyflow/react';

interface PlaceholderData {
  name: string;
  kind: string;
  cardWidth: number;
  cardHeight: number;
  isEditing: boolean;
  editingLabel: string;
  editingError?: string;
  onConfirmEdit: (name: string) => Promise<void>;
  onCancelEdit: () => void;
}

function createNodeStore(initial: Node[]): { setNodes: (updater: (nodes: Node[]) => Node[]) => void; nodes: () => Node[] } {
  let nodes = initial;
  return {
    setNodes: (updater) => {
      nodes = updater(nodes);
    },
    nodes: () => nodes,
  };
}

function placeholderData(node: Node): PlaceholderData {
  return node.data as unknown as PlaceholderData;
}

const BASE_PARAMS = {
  tempId: 'temp-1',
  type: 'system' as const,
  position: { x: 40, y: 60 },
};

describe('buildPlaceholderNode', () => {
  it('baut einen bearbeitbaren Platzhalter mit Registry-Typ und Kartengröße', () => {
    const store = createNodeStore([]);

    const node = buildPlaceholderNode({ ...BASE_PARAMS, setNodes: store.setNodes });
    const data = placeholderData(node);

    expect(node.id).toBe('temp-1');
    expect(node.type).toBe('systemCard');
    expect(node.position).toEqual({ x: 40, y: 60 });
    expect(data).toMatchObject({
      name: '',
      kind: 'system',
      cardWidth: CARD.width,
      cardHeight: CARD.height,
      isEditing: true,
      editingLabel: 'New System',
    });
  });

  it('leitet Typ-Label und Node-Typ aus dem Objekt-Typ ab', () => {
    const store = createNodeStore([]);

    const node = buildPlaceholderNode({ ...BASE_PARAMS, type: 'component', setNodes: store.setNodes });

    expect(node.type).toBe('containerCard');
    expect(placeholderData(node).editingLabel).toBe('New Component');
  });

  it('speichert den Namen nach erfolgreichem Confirm', async () => {
    const confirm = vi.fn(async () => ({ id: 'api' }));
    const onConfirmed = vi.fn();
    const store = createNodeStore([]);
    const node = buildPlaceholderNode({
      ...BASE_PARAMS,
      setNodes: store.setNodes,
      onConfirmPlaceholder: confirm,
      onConfirmed,
    });
    store.setNodes(() => [node]);

    await placeholderData(node).onConfirmEdit('API Gateway');

    expect(confirm).toHaveBeenCalledWith('temp-1', 'API Gateway', undefined);
    expect(store.nodes()[0].data).toMatchObject({ name: 'API Gateway', isEditing: false });
    expect(onConfirmed).toHaveBeenCalledWith('api');
  });

  it('ersetzt die Platzhalter-ID bei remapIdOnConfirm durch die persistierte ID', async () => {
    const store = createNodeStore([]);
    const node = buildPlaceholderNode({
      ...BASE_PARAMS,
      setNodes: store.setNodes,
      onConfirmPlaceholder: async () => ({ id: 'api' }),
      remapIdOnConfirm: true,
    });
    store.setNodes(() => [node]);

    await placeholderData(node).onConfirmEdit('API');

    expect(store.nodes()[0].id).toBe('api');
  });

  it('reicht sourceNodeId als Confirm-Option weiter', async () => {
    const confirm = vi.fn(async () => ({ id: 'api' }));
    const store = createNodeStore([]);
    const node = buildPlaceholderNode({
      ...BASE_PARAMS,
      setNodes: store.setNodes,
      onConfirmPlaceholder: confirm,
      sourceNodeId: 'backend',
    });
    store.setNodes(() => [node]);

    await placeholderData(node).onConfirmEdit('API');

    expect(confirm).toHaveBeenCalledWith('temp-1', 'API', { sourceNodeId: 'backend' });
  });

  it('setzt einen Speicherfehler, wenn der Confirm null liefert', async () => {
    const onConfirmed = vi.fn();
    const store = createNodeStore([]);
    const node = buildPlaceholderNode({
      ...BASE_PARAMS,
      setNodes: store.setNodes,
      onConfirmPlaceholder: async () => null,
      onConfirmed,
    });
    store.setNodes(() => [node]);

    await placeholderData(node).onConfirmEdit('API');

    expect(store.nodes()[0].data).toMatchObject({ editingError: 'Fehler beim Speichern' });
    expect(onConfirmed).not.toHaveBeenCalled();
  });

  it('setzt einen Speicherfehler, wenn kein Confirm-Callback verdrahtet ist', async () => {
    const store = createNodeStore([]);
    const node = buildPlaceholderNode({ ...BASE_PARAMS, setNodes: store.setNodes });
    store.setNodes(() => [node]);

    await placeholderData(node).onConfirmEdit('API');

    expect(store.nodes()[0].data).toMatchObject({ editingError: 'Fehler beim Speichern' });
  });

  it('entfernt den Platzhalter beim Abbruch und meldet den Abbruch', () => {
    const onCancelled = vi.fn();
    const onCancelPlaceholder = vi.fn();
    const store = createNodeStore([]);
    const node = buildPlaceholderNode({
      ...BASE_PARAMS,
      setNodes: store.setNodes,
      onCancelled,
      onCancelPlaceholder,
    });
    store.setNodes(() => [node]);

    placeholderData(node).onCancelEdit();

    expect(store.nodes()).toEqual([]);
    expect(onCancelled).toHaveBeenCalledWith();
    expect(onCancelPlaceholder).toHaveBeenCalledWith('temp-1');
  });
});
