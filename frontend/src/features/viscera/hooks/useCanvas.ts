import { useCallback, useEffect, useRef, useState } from 'react';


import { selectFitViewRequested, selectViewport } from '../store/selectors';
import { useVisceraStore } from '../store/visceraStore';

import type { ReactFlowInstance, Node } from '@xyflow/react';

// ── Constants ───────────────────────────────────────────────────────────────

const PULSE_DURATION_MS = 2000;

// ── Interfaces ──────────────────────────────────────────────────────────────

export interface UseCanvasInput {
  /** Current view key for viewport-reset on view switch. */
  currentViewKey: string;
  /** Current ReactFlow nodes (for fitView readiness check). */
  nodes: Node[];
  /** ReactFlow instance for imperative fitView calls. */
  reactFlowInstance: ReactFlowInstance;
  /** Called when a card is clicked to open the ObjectDetailsPanel. */
  onObjectClick?: (id: string) => void;
}

export interface UseCanvasOutput {
  /** Current viewport from store (URL-hydrated). */
  viewport: { x: number; y: number; zoom: number };
  /** Viewport change handler → store.setViewport. */
  onViewportChange: (viewport: { x: number; y: number; zoom: number }) => void;
  /** Node click handler: start pulse (selection only — no panel). */
  onNodeClick: (event: React.MouseEvent, node: Node) => void;
  /** Node double-click handler: pulse + onObjectClick (opens ObjectDetailsPanel). */
  onNodeDoubleClick: (event: React.MouseEvent, node: Node) => void;
  /** Node mouse enter handler: sets hovered card ID. */
  onNodeMouseEnter: (event: React.MouseEvent, node: Node) => void;
  /** Node mouse leave handler: clears hovered card ID. */
  onNodeMouseLeave: (event: React.MouseEvent, node: Node) => void;
  /** Currently hovered card ID (drives edge highlighting). */
  hoveredCardId: string | null;
  /** Currently selected/pulsed card ID (drives edge pulse animation). */
  selectedCardId: string | null;
}

// ── Hook ────────────────────────────────────────────────────────────────────

/**
 * Kapselt die Canvas-Interaktionslogik:
 * Viewport-Lifecycle und Hover/Pulse-State.
 * Node-Dragging läuft seit #2294 über @dnd-kit (``VisceraDndContext``).
 */
export function useCanvas({
  currentViewKey,
  nodes,
  reactFlowInstance,
  onObjectClick,
}: UseCanvasInput): UseCanvasOutput {
  const canvasViewport = useVisceraStore(selectViewport);

  // ── Hover / Pulse State ──────────────────────────────────────────────────

  const [hoveredCardId, setHoveredCardId] = useState<string | null>(null);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const pulseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearPulseTimer = useCallback(() => {
    if (pulseTimerRef.current) {
      clearTimeout(pulseTimerRef.current);
      pulseTimerRef.current = null;
    }
  }, []);

  const startPulse = useCallback(
    (cardId: string) => {
      clearPulseTimer();
      setSelectedCardId(cardId);
      pulseTimerRef.current = setTimeout(() => {
        setSelectedCardId(null);
      }, PULSE_DURATION_MS);
    },
    [clearPulseTimer],
  );

  // Cleanup pulse timer on unmount
  useEffect(() => {
    return () => clearPulseTimer();
  }, [clearPulseTimer]);

  // ── Viewport Lifecycle ───────────────────────────────────────────────────

  const fitViewRan = useRef(false);

  // Reset fitView flag when view key changes (re-fit for new diagram)
  useEffect(() => {
    fitViewRan.current = false;
  }, [currentViewKey]);

  // Initial fitView or viewport restore from store (URL-deep-link)
  useEffect(() => {
    if (fitViewRan.current) return;
    if (nodes.length === 0) return;

    const viewport = useVisceraStore.getState().viewport;
    const isDefault = viewport.x === 0 && viewport.y === 0 && viewport.zoom === 1;
    if (!isDefault) {
      fitViewRan.current = true;
      return;
    }

    fitViewRan.current = true;
    reactFlowInstance.fitView({ padding: 0.2, duration: 400 });
  }, [reactFlowInstance, nodes.length, currentViewKey]);

  // fitViewRequested watcher: triggered by shortcuts (e.g. '1', '0')
  const fitViewRequested = useVisceraStore(selectFitViewRequested);
  useEffect(() => {
    if (!fitViewRequested) return;
    reactFlowInstance.fitView({ padding: 0.2, duration: 400 });
    useVisceraStore.getState().resetFitViewRequested();
  }, [fitViewRequested, reactFlowInstance]);

  // ── Viewport Change Handler ──────────────────────────────────────────────

  const lastSyncedViewport = useRef<{ x: number; y: number; zoom: number }>({
    x: 0,
    y: 0,
    zoom: 1,
  });

  /**
   * Viewport change handler.
   * Syncs ReactFlow viewport changes to store, where persistUrl middleware
   * (with its own 200ms debounce) writes them to the URL.
   */
  const onViewportChange = useCallback(
    (viewport: { x: number; y: number; zoom: number }) => {
      const zoom = +(viewport.zoom.toFixed(2));
      const x = Math.round(viewport.x);
      const y = Math.round(viewport.y);
      const prev = lastSyncedViewport.current;
      if (zoom === prev.zoom && x === prev.x && y === prev.y) return;

      lastSyncedViewport.current = { x, y, zoom };
      useVisceraStore.getState().setViewport({ x, y, zoom });
    },
    [],
  );

  // ── Event Handlers ───────────────────────────────────────────────────────

  const onNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      startPulse(node.id);
    },
    [startPulse],
  );

  const onNodeDoubleClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      startPulse(node.id);
      onObjectClick?.(node.id);
    },
    [onObjectClick, startPulse],
  );

  const onNodeMouseEnter = useCallback((_event: React.MouseEvent, node: Node) => {
    setHoveredCardId(node.id);
  }, []);

  const onNodeMouseLeave = useCallback((_event: React.MouseEvent, _node: Node) => {
    setHoveredCardId(null);
  }, []);

  return {
    viewport: canvasViewport,
    onViewportChange,
    onNodeClick,
    onNodeDoubleClick,
    onNodeMouseEnter,
    onNodeMouseLeave,
    hoveredCardId,
    selectedCardId,
  };
}
