/**
 * Tests: useCanvas
 *
 * Verifies viewport synchronisation (rounding, zoom precision, dedupe), the
 * initial fit-view decision, the fit-view request watcher, and the hover/pulse
 * state including the 2s pulse timeout.
 */

import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useCanvas } from '@src/features/viscera/hooks/useCanvas';
import { useVisceraStore } from '@src/features/viscera/store/visceraStore';

import { resetVisceraStore } from '../helpers';

import type { Node, ReactFlowInstance } from '@xyflow/react';

interface FitCall {
  padding?: number;
  duration?: number;
}

function makeReactFlowInstance(): { instance: ReactFlowInstance; calls: FitCall[] } {
  const calls: FitCall[] = [];
  const instance = {
    fitView: (options?: FitCall) => {
      calls.push(options ?? {});
    },
  } as unknown as ReactFlowInstance;
  return { instance, calls };
}

const NODES = [{ id: 'backend' }] as Node[];

beforeEach(() => {
  resetVisceraStore();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('useCanvas', () => {
  it('exposes the store viewport', () => {
    useVisceraStore.setState({ viewport: { x: 5, y: 6, zoom: 1.5 } });
    const { instance } = makeReactFlowInstance();

    const { result } = renderHook(() =>
      useCanvas({ currentViewKey: 'SystemContext', nodes: NODES, reactFlowInstance: instance }),
    );

    expect(result.current.viewport).toEqual({ x: 5, y: 6, zoom: 1.5 });
  });

  it('rounds and clamps viewport values before storing them', () => {
    const { instance } = makeReactFlowInstance();
    const { result } = renderHook(() =>
      useCanvas({ currentViewKey: 'SystemContext', nodes: NODES, reactFlowInstance: instance }),
    );

    act(() => result.current.onViewportChange({ x: 10.4, y: 20.6, zoom: 1.234 }));

    expect(useVisceraStore.getState().viewport).toEqual({ x: 10, y: 21, zoom: 1.23 });
  });

  it('ignores repeated viewport changes with identical rounded values', () => {
    const { instance } = makeReactFlowInstance();
    const { result } = renderHook(() =>
      useCanvas({ currentViewKey: 'SystemContext', nodes: NODES, reactFlowInstance: instance }),
    );
    act(() => result.current.onViewportChange({ x: 10.4, y: 20.6, zoom: 1.234 }));

    act(() => useVisceraStore.setState({ viewport: { x: 0, y: 0, zoom: 1 } }));
    act(() => result.current.onViewportChange({ x: 10.4, y: 20.6, zoom: 1.234 }));

    expect(useVisceraStore.getState().viewport).toEqual({ x: 0, y: 0, zoom: 1 });
  });

  it('fits the view on first render when the viewport is default', () => {
    const { instance, calls } = makeReactFlowInstance();

    renderHook(() =>
      useCanvas({ currentViewKey: 'SystemContext', nodes: NODES, reactFlowInstance: instance }),
    );

    expect(calls).toEqual([{ padding: 0.2, duration: 400 }]);
  });

  it('does not fit the view when a deep-linked viewport is restored', () => {
    useVisceraStore.setState({ viewport: { x: 100, y: 200, zoom: 1.5 } });
    const { instance, calls } = makeReactFlowInstance();

    renderHook(() =>
      useCanvas({ currentViewKey: 'SystemContext', nodes: NODES, reactFlowInstance: instance }),
    );

    expect(calls).toEqual([]);
  });

  it('fits the view and clears the request flag after a shortcut request', () => {
    const { instance, calls } = makeReactFlowInstance();
    renderHook(() =>
      useCanvas({ currentViewKey: 'SystemContext', nodes: NODES, reactFlowInstance: instance }),
    );
    calls.length = 0;

    act(() => useVisceraStore.getState().fitView());

    expect(calls).toEqual([{ padding: 0.2, duration: 400 }]);
    expect(useVisceraStore.getState().fitViewRequested).toBe(false);
  });

  it('clears the pulse selection after the pulse duration', () => {
    vi.useFakeTimers();
    const { instance } = makeReactFlowInstance();
    const { result } = renderHook(() =>
      useCanvas({ currentViewKey: 'SystemContext', nodes: [], reactFlowInstance: instance }),
    );

    act(() => result.current.onNodeClick({} as React.MouseEvent, { id: 'api' } as Node));
    expect(result.current.selectedCardId).toBe('api');

    act(() => vi.advanceTimersByTime(2000));

    expect(result.current.selectedCardId).toBeNull();
  });

  it('pulses the node and opens the object on double click', () => {
    const clicked: string[] = [];
    const { instance } = makeReactFlowInstance();
    const { result } = renderHook(() =>
      useCanvas({
        currentViewKey: 'SystemContext',
        nodes: [],
        reactFlowInstance: instance,
        onObjectClick: (id) => clicked.push(id),
      }),
    );

    act(() => result.current.onNodeDoubleClick({} as React.MouseEvent, { id: 'db' } as Node));

    expect(result.current.selectedCardId).toBe('db');
    expect(clicked).toEqual(['db']);
  });

  it('tracks the hovered card on mouse enter and leave', () => {
    const { instance } = makeReactFlowInstance();
    const { result } = renderHook(() =>
      useCanvas({ currentViewKey: 'SystemContext', nodes: [], reactFlowInstance: instance }),
    );

    act(() => result.current.onNodeMouseEnter({} as React.MouseEvent, { id: 'api' } as Node));
    expect(result.current.hoveredCardId).toBe('api');

    act(() => result.current.onNodeMouseLeave({} as React.MouseEvent, { id: 'api' } as Node));
    expect(result.current.hoveredCardId).toBeNull();
  });
});
