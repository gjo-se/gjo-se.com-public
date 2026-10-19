import { produce } from 'immer';
import { z } from 'zod';

import { overrideKey } from '../core/nodeOverrides';

import { buildSyncEntry, diagramStatusSchema } from './diagramSync';

import type { DiagramNode, DiagramSlice } from './diagramSliceTypes';
import type { VisceraStore } from './visceraStore';
import type { OverridePosition } from '../core/nodeOverrides';
import type { StateCreator } from 'zustand';

export type {
  DiagramEdge,
  DiagramNode,
  DiagramSlice,
  NodeBounds,
  SyncQueueEntry,
} from './diagramSliceTypes';

export const createDiagramSlice: StateCreator<VisceraStore, [], [], DiagramSlice> = (set) => ({
  nodes: [],
  edges: [],
  nodeOverrides: {},
  syncQueue: [],

  setNodes: (nodes) =>
    set(
      produce((state: VisceraStore) => {
        // Preserve transient (optimistic) nodes that aren't yet in the incoming
        // workspace data. Without this, Vite HMR workspace reloads (triggered by
        // the backend writing workspace.yml after an API call) would wipe
        // optimistic nodes from the canvas before the API response arrives.
        const incomingIds = new Set(nodes.map((n) => n.id));
        const orphans = state.nodes.filter((n) => n.isTransient && !incomingIds.has(n.id));
        state.nodes = [...nodes, ...orphans];
      }),
    ),

  setEdges: (edges) =>
    set(
      produce((state: VisceraStore) => {
        state.edges = edges;
      }),
    ),

  addNode: (node) =>
    set(
      produce((state: VisceraStore) => {
        const transientNode: DiagramNode = { ...node, isTransient: true };
        state.nodes.push(transientNode);
      }),
    ),

  addEdge: (edge) =>
    set(
      produce((state: VisceraStore) => {
        state.edges.push(edge);
      }),
    ),

  deleteEdge: (edgeId) =>
    set(
      produce((state: VisceraStore) => {
        state.edges = state.edges.filter((e) => e.id !== edgeId);
        state.syncQueue = state.syncQueue.filter((e) => e.nodeId !== edgeId);
      }),
    ),

  updateNode: (nodeId, data) =>
    set(
      produce((state: VisceraStore) => {
        const node = state.nodes.find((n) => n.id === nodeId);
        if (node) {
          node.data = data;
        }
      }),
    ),

  deleteNode: (nodeId) =>
    set(
      produce((state: VisceraStore) => {
        state.nodes = state.nodes.filter((n) => n.id !== nodeId);
        // Remove all per-diagram overrides for this node (keys: `${diagramKey}:${nodeId}`)
        Object.keys(state.nodeOverrides).forEach((key) => {
          if (key.endsWith(`:${nodeId}`)) {
            delete state.nodeOverrides[key];
          }
        });
        state.syncQueue = state.syncQueue.filter((e) => e.nodeId !== nodeId);
      }),
    ),

  moveNode: (nodeId, position, diagramKey, bounds) =>
    set(
      produce((state: VisceraStore) => {
        const node = state.nodes.find((n) => n.id === nodeId);
        if (node) {
          node.position = position;
        }
        const key = overrideKey(diagramKey, nodeId);
        // Bounds (group size) become part of the override so the canvas renders
        // the new size immediately, before the YAML round-trip completes.
        const nextOverride: OverridePosition = { x: position.x, y: position.y };
        if (bounds?.width !== undefined) nextOverride.width = bounds.width;
        if (bounds?.height !== undefined) nextOverride.height = bounds.height;
        state.nodeOverrides[key] = nextOverride;
        const payload: Record<string, unknown> = { x: position.x, y: position.y, diagramKey };
        // Only include bounds when present — regular node drags must stay {x, y} only (#2293).
        if (bounds?.width !== undefined) payload.width = bounds.width;
        if (bounds?.height !== undefined) payload.height = bounds.height;
        state.syncQueue.push(buildSyncEntry(nodeId, 'move', payload));
      }),
    ),

  queueSync: (entry) =>
    set(
      produce((state: VisceraStore) => {
        state.syncQueue.push({
          ...entry,
          retryCount: 0,
          status: 'pending',
        });
      }),
    ),

  removeFromQueue: (mutationId) =>
    set(
      produce((state: VisceraStore) => {
        state.syncQueue = state.syncQueue.filter((e) => e.mutationId !== mutationId);
      }),
    ),

  clearTransient: (nodeId) =>
    set(
      produce((state: VisceraStore) => {
        const node = state.nodes.find((n) => n.id === nodeId);
        if (node) {
          node.isTransient = false;
        }
      }),
    ),

  updateSyncEntry: (mutationId, patch) =>
    set(
      produce((state: VisceraStore) => {
        const entry = state.syncQueue.find((e) => e.mutationId === mutationId);
        if (entry) {
          if (patch.retryCount !== undefined) entry.retryCount = patch.retryCount;
          if (patch.status !== undefined) entry.status = patch.status;
          if (patch.error !== undefined) entry.error = patch.error;
        }
      }),
    ),

  // ── Field-Level Mutations ──────────────────────────────────────────────────

  updateNodeStatus: (nodeId, status) => {
    if (typeof status !== 'string') {
      console.warn('updateNodeStatus validation failed: status must be a string');
      return;
    }
    set(
      produce((state: VisceraStore) => {
        const node = state.nodes.find((n) => n.id === nodeId);
        if (!node) return;
        node.data.status = status;
        state.syncQueue.push(buildSyncEntry(nodeId, 'status_change', { status }));
      }),
    );
  },

  updateNodeTags: (nodeId, tags) => {
    const parsed = z.array(z.string().min(1)).safeParse(tags);
    if (!parsed.success) {
      console.warn('updateNodeTags validation failed:', parsed.error.issues);
      return;
    }
    set(
      produce((state: VisceraStore) => {
        const node = state.nodes.find((n) => n.id === nodeId);
        if (!node) return;
        node.data.tags = parsed.data;
        state.syncQueue.push(buildSyncEntry(nodeId, 'tags_change', { tags: parsed.data }));
      }),
    );
  },

  updateNodeTechnologies: (nodeId, technologies) => {
    const parsed = z.array(z.string().min(1)).safeParse(technologies);
    if (!parsed.success) {
      console.warn('updateNodeTechnologies validation failed:', parsed.error.issues);
      return;
    }
    set(
      produce((state: VisceraStore) => {
        const node = state.nodes.find((n) => n.id === nodeId);
        if (!node) return;
        node.data.technologies = parsed.data;
        state.syncQueue.push(buildSyncEntry(nodeId, 'tech_change', { technologies: parsed.data }));
      }),
    );
  },

  addAnnotation: (nodeId, text, author) =>
    set(
      produce((state: VisceraStore) => {
        const node = state.nodes.find((n) => n.id === nodeId);
        if (!node) return;
        const annotations = Array.isArray(node.data.annotations) ? [...node.data.annotations] : [];
        annotations.push({ text, author, date: new Date().toISOString() });
        node.data.annotations = annotations;
        state.syncQueue.push(buildSyncEntry(nodeId, 'annotation_add', { annotations }));
      }),
    ),

  updateAnnotation: (nodeId, index, text) =>
    set(
      produce((state: VisceraStore) => {
        const node = state.nodes.find((n) => n.id === nodeId);
        if (!node) return;
        if (!Array.isArray(node.data.annotations) || !node.data.annotations[index]) return;
        node.data.annotations[index] = { ...node.data.annotations[index], text };
        state.syncQueue.push(buildSyncEntry(nodeId, 'annotation_update', { annotations: node.data.annotations }));
      }),
    ),

  deleteAnnotation: (nodeId, index) =>
    set(
      produce((state: VisceraStore) => {
        const node = state.nodes.find((n) => n.id === nodeId);
        if (!node) return;
        if (!Array.isArray(node.data.annotations) || !node.data.annotations[index]) return;
        node.data.annotations.splice(index, 1);
        state.syncQueue.push(buildSyncEntry(nodeId, 'annotation_delete', { annotations: node.data.annotations }));
      }),
    ),

  updateNodeField: (nodeId, field, value) =>
    set(
      produce((state: VisceraStore) => {
        const node = state.nodes.find((n) => n.id === nodeId);
        if (!node) return;
        node.data[field] = value;
        state.syncQueue.push(buildSyncEntry(nodeId, 'field_update', { field, value }));
      }),
    ),

  persistLayout: (diagramKey, positions) =>
    set(
      produce((state: VisceraStore) => {
        state.syncQueue.push(buildSyncEntry(diagramKey, 'persist_layout', { diagramKey, nodes: positions }));
      }),
    ),

  updateDiagram: (diagramKey, payload) =>
    set(
      produce((state: VisceraStore) => {
        state.syncQueue.push(buildSyncEntry(diagramKey, 'update_diagram', { key: diagramKey, ...payload }));
      }),
    ),

  updateDiagramStatus: (diagramKey, status) => {
    const parsed = diagramStatusSchema.safeParse(status);
    if (!parsed.success) {
      console.warn('updateDiagramStatus validation failed:', parsed.error.issues);
      return;
    }
    set(
      produce((state: VisceraStore) => {
        state.syncQueue.push(buildSyncEntry(diagramKey, 'update_diagram', { key: diagramKey, status: parsed.data }));
      }),
    );
  },

  deleteDiagram: (diagramKey) =>
    set(
      produce((state: VisceraStore) => {
        state.syncQueue.push(buildSyncEntry(diagramKey, 'delete_diagram', {}));
      }),
    ),
});
