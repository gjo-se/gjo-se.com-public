/**
 * Tests: useDetailPanel
 *
 * Verifies the panel business logic: status resolution and transitions, the
 * rejected flow (dialog + optimistic status/annotation), delete, annotation
 * CRUD, copy feedback, the derived-node save path and Escape-to-close.
 */

import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useVisceraStore } from '@src/features/viscera/store/visceraStore';
import { useDetailPanel } from '@src/features/viscera/viewer/hooks/useDetailPanel';

import {
  makeObject,
  makeWorkspace,
  makeWorkspaceWrapper,
  resetVisceraStore,
} from '../../helpers';

import type { ObjectDetail } from '@src/features/viscera/viewer/hooks/useObjectDetail';
import type { Workspace } from '@src/features/viscera/core/workspaceSchema';

const apiMock = vi.hoisted(() => ({ post: vi.fn() }));

vi.mock('@src/lib/api/axios', () => ({ api: { post: apiMock.post } }));

function makeDetail(patch: Partial<ObjectDetail> = {}): ObjectDetail {
  return {
    objectId: 'backend',
    name: 'Backend',
    type: 'system',
    description: 'Backend system',
    tags: [],
    technologies: [],
    status: 'viscera-approved',
    parentId: null,
    parentName: null,
    scope: null,
    diagrams: [],
    flows: [],
    childrenCount: 0,
    annotations: [],
    technologyCandidates: [],
    typeLabel: 'System',
    typeOptions: [],
    fields: [
      { label: 'Status', value: 'viscera-approved', field: 'status' },
      { label: 'Description', value: 'Backend system', field: 'description' },
    ],
    isDerived: false,
    ...patch,
  };
}

let updates: Workspace[] = [];
const workspace = makeWorkspace({
  objects: [makeObject({ id: 'backend', name: 'Backend', type: 'system' })],
});

function seedNode(data: Record<string, unknown> = {}): void {
  useVisceraStore.setState({
    nodes: [
      {
        id: 'backend',
        type: 'systemCard',
        position: { x: 10, y: 20 },
        data: { name: 'Backend', kind: 'system', cardWidth: 200, cardHeight: 100, annotations: [], ...data },
        isTransient: false,
      },
    ],
  });
}

function renderPanel(detail: ObjectDetail | null, onClose = () => undefined) {
  const wrapper = makeWorkspaceWrapper(workspace, (next) => updates.push(next));
  return renderHook(() => useDetailPanel({ objectId: 'backend', detail, onClose }), { wrapper });
}

beforeEach(() => {
  resetVisceraStore();
  updates = [];
  apiMock.post.mockReset();
  apiMock.post.mockResolvedValue({ data: { noticeId: 'n1', status: 'queued' } });
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { writeText: async () => undefined },
  });
});

describe('useDetailPanel', () => {
  it('resolves the current status from the detail fields', () => {
    const { result } = renderPanel(makeDetail());

    expect(result.current.currentStatus).toBe('viscera-approved');
    expect(result.current.isDeprecated).toBe(false);
  });

  it('defaults to approved without detail and detects deprecated objects', () => {
    const { result: noDetail } = renderPanel(null);
    expect(noDetail.current.currentStatus).toBe('viscera-approved');

    const { result: deprecated } = renderPanel(
      makeDetail({
        fields: [{ label: 'Status', value: 'viscera-deprecated', field: 'status' }],
      }),
    );
    expect(deprecated.current.currentStatus).toBe('viscera-deprecated');
    expect(deprecated.current.isDeprecated).toBe(true);
  });

  it('warns explicitly for approved and pending objects', () => {
    expect(renderPanel(makeDetail()).result.current.deleteWarning).toContain('viscera-approved');

    const { result: pending } = renderPanel(
      makeDetail({ fields: [{ label: 'Status', value: 'viscera-pending', field: 'status' }] }),
    );
    expect(pending.current.deleteWarning).toContain('viscera-pending');
  });

  it('updates the object status optimistically in store and workspace', () => {
    seedNode();
    const { result } = renderPanel(makeDetail());

    act(() => result.current.handleStatusChange('viscera-pending'));

    expect(useVisceraStore.getState().nodes[0]?.data.status).toBe('viscera-pending');
    expect(updates[0]?.objects?.[0]?.status).toBe('viscera-pending');
    expect(useVisceraStore.getState().syncQueue[0]).toMatchObject({
      action: 'status_change',
      payload: { status: 'viscera-pending' },
    });
  });

  it('opens the rejection dialog instead of writing the rejected status', () => {
    seedNode();
    const { result } = renderPanel(makeDetail());

    act(() => result.current.handleStatusChange('viscera-rejected'));

    expect(result.current.rejectionDialogOpen).toBe(true);
    expect(useVisceraStore.getState().syncQueue).toEqual([]);
  });

  it('marks the object rejected and adds an annotation on confirm', async () => {
    seedNode();
    const { result } = renderPanel(makeDetail());

    await act(async () => {
      await result.current.handleRejectionConfirm('wrong classification', 'tighten the prompt');
    });

    const node = useVisceraStore.getState().nodes[0];
    expect(node?.data.status).toBe('viscera-rejected');
    expect((node?.data.annotations as { text: string }[])[0]?.text).toBe(
      'REJECTED: wrong classification',
    );
    expect(result.current.rejectionDialogOpen).toBe(false);
    expect(result.current.rejectionSending).toBe(false);
  });

  it('deletes the node, queues the delete and closes the panel', () => {
    seedNode();
    let closed = 0;
    const { result } = renderPanel(makeDetail(), () => { closed += 1; });

    act(() => result.current.handleDeleteConfirm());

    expect(useVisceraStore.getState().nodes).toEqual([]);
    expect(useVisceraStore.getState().syncQueue[0]?.action).toBe('delete');
    expect(closed).toBe(1);
    expect(result.current.deleteDialogOpen).toBe(false);
  });

  it('adds, edits and deletes annotations', () => {
    seedNode({ annotations: [{ text: 'old', author: 'greg', date: '2026-01-01' }] });
    const detail = makeDetail({
      annotations: [{ text: 'old', author: 'greg', date: '2026-01-01' }],
    });
    const { result } = renderPanel(detail);

    act(() => result.current.setNewAnnotationText('  note  '));
    act(() => result.current.handleAddAnnotation());
    expect((useVisceraStore.getState().nodes[0]?.data.annotations as { text: string }[])[1]?.text).toBe('note');

    act(() => result.current.handleEditAnnotation(0));
    expect(result.current.editingIndex).toBe(0);
    expect(result.current.editText).toBe('old');

    act(() => result.current.handleSaveEdit('updated'));
    expect((useVisceraStore.getState().nodes[0]?.data.annotations as { text: string }[])[0]?.text).toBe('updated');

    act(() => result.current.handleDeleteAnnotation(0));
    expect((useVisceraStore.getState().nodes[0]?.data.annotations as unknown[]).length).toBe(1);
  });

  it('ignores a blank new annotation', () => {
    seedNode();
    const { result } = renderPanel(makeDetail());

    act(() => result.current.handleAddAnnotation());

    expect(useVisceraStore.getState().syncQueue).toEqual([]);
  });

  it('toggles the copy feedback after a successful clipboard write', async () => {
    vi.useFakeTimers();
    const { result } = renderPanel(makeDetail());

    await act(async () => {
      await result.current.handleCopy();
    });

    expect(result.current.copied).toBe(true);
    act(() => vi.advanceTimersByTime(2000));
    expect(result.current.copied).toBe(false);
    vi.useRealTimers();
  });

  it('queues a move mutation for derived description saves only', async () => {
    seedNode();
    const { result: derived } = renderPanel(makeDetail({ isDerived: true }));

    const ignored = await derived.current.handleDerivedFieldSave('backend', 'name', 'x');
    expect(ignored).toEqual({ success: true });
    expect(useVisceraStore.getState().syncQueue).toEqual([]);

    const saved = await derived.current.handleDerivedFieldSave('backend', 'description', 'text');
    expect(saved).toEqual({ success: true });
    expect(useVisceraStore.getState().syncQueue[0]).toMatchObject({
      action: 'move',
      payload: { x: 10, y: 20, description: 'text' },
    });
  });

  it('closes the panel on escape', async () => {
    let closed = 0;
    renderPanel(makeDetail(), () => { closed += 1; });

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    });

    await waitFor(() => expect(closed).toBe(1));
  });
});
